/*
 *
 * Copyright (c) 2019-present for NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License ");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
	TransactionType,
	Address,
	TransactionInfo,
	AggregateTransactionInfo,
	TransactionGroup,
	Order,
	UInt64
} from 'symbol-sdk';
import Constants from '../config/constants';
import http from './http';
import helper from '../helper';
import {
	BlockService,
	LockService,
	CreateTransaction
} from '../infrastructure';
import { toArray } from 'rxjs/operators';

class TransactionService {
  /**
   * Gets a transaction status for a transaction hash
   * @param hash Transaction hash
   * @returns TransactionStatus object
   */
  static getTransactionStatus = (hash) => {
  	return new Promise((resolve, reject) => {
  		let transactionStatus = {
  			message: null,
  			detail: {}
  		};

  		http.createRepositoryFactory.createTransactionStatusRepository()
  			.getTransactionStatus(hash)
  			.toPromise()
  			.then(response => {
  				transactionStatus.message = response.group;
  				transactionStatus.detail = response;
  				resolve(transactionStatus);
  			})
  			.catch(error => {
  				reject(error);
  			});
  	});
  }

  /**
   * Gets a transaction from hash
   * @param hash Transaction hash
   * @returns Transaction
   */
  static getTransaction = async (hash, transactionGroup) => {
  	const transaction = await http.createRepositoryFactory.createTransactionRepository()
  		.getTransaction(hash, transactionGroup)
  		.toPromise();

  	return transaction;
  }

  /**
   * Gets a transaction from searchCriteria
   * @param transactionSearchCriteria Object of Search Criteria
   * @returns transaction data with pagination info
   */
  static searchTransactions = async (transactionSearchCriteria) => {
  	const searchTransactions = await http.createRepositoryFactory.createTransactionRepository()
  		.search(transactionSearchCriteria)
  		.toPromise();

  	return searchTransactions;
  }

  /**
   * Gets a transactions from streamer
   * @param transactionSearchCriteria Object of Search Criteria
   * @returns Transaction[]
   */
  static streamerTransactions = async (transactionSearchCriteria) => {
  	const streamerTransactions = await http.transactionPaginationStreamer
  		.search(transactionSearchCriteria).pipe(toArray())
  		.toPromise();

  	return streamerTransactions;
  }

  /**
   * Gets a transaction's effective paid fee
   * @param hash Transaction hash
   * @returns formatted effectiveFee string
   */
  static getTransactionEffectiveFee = async (hash) => {
  	let effectiveFee = await http.createRepositoryFactory.createTransactionRepository()
  		.getTransactionEffectiveFee(hash)
  		.toPromise();

  	return helper.toNetworkCurrency(effectiveFee);
  }

  /**
   * Gets Formatted Transaction Info for Vue component
   * @param hash Transaction hash
   * @returns Custom Transaction object
   */
  static getTransactionInfo = async (hash, transactionGroup = TransactionGroup.Confirmed) => {
  	const transaction = await this.getTransaction(hash, transactionGroup);

  	const [{ date }, effectiveFee, transactionStatus, merklePath] = await Promise.all([
		  BlockService.getBlockInfo(UInt64.fromUint(transaction.transactionInfo.height)),
		  this.getTransactionEffectiveFee(hash),
		  this.getTransactionStatus(hash),
		  BlockService.getMerkleTransaction(UInt64.fromUint(transaction.transactionInfo.height), transaction.transactionInfo.merkleComponentHash)
	  ]);

  	const formattedTransaction = await this.createTransactionFromSDK(transaction);

  	const transactionInfo = {
		  ...formattedTransaction,
		  blockHeight: formattedTransaction.transactionInfo.height,
		  transactionHash: formattedTransaction.transactionInfo.hash,
		  effectiveFee,
		  date,
		  status: transactionStatus.detail.code,
		  confirm: transactionStatus.message,
		  merklePath
  	};

  	return transactionInfo;
  }

  /**
   * Gets Formatted Hash Lock Info for Vue component
   * @param hash Transaction hash
   * @returns Custom Hash Lock object
   */
  static getHashLockInfo = async (hash) => {
  	const hashInfo = await LockService.getHashLock(hash);

  	return hashInfo;
  }

  /**
   * Gets array of transactions
   * @param pageInfo - object for page info such as pageNumber, pageSize
   * @param filterVaule - object for search criteria
   * @returns Formatted tranctionDTO[]
   */
  static getTransactionList = async (pageInfo, filterVaule) => {
  	const { pageNumber, pageSize } = pageInfo;
  	const searchCriteria = {
  		pageNumber,
  		pageSize,
  		order: Order.Desc,
  		type: [],
  		group: TransactionGroup.Confirmed,
  		...filterVaule
  	};

  	const searchTransactions = await this.searchTransactions(searchCriteria);

  	const transactions = {
  		...searchTransactions,
  		data: searchTransactions.data.map(transaction => this.formatTransaction(transaction))
  	};

  	await Promise.all(transactions.data.map(async transaction => {
  		if (transaction?.recipientAddress)
  			return (transaction.transactionBody.recipient = await helper.resolvedAddress(transaction.recipientAddress));
  	}));

  	return {
  		...transactions,
  		data: transactions.data.map(transaction => ({
  			...transaction,
  			height: transaction.transactionInfo.height,
  			transactionHash: transaction.transactionInfo.hash,
  			transactionType: transaction.type,
  			recipient: transaction.transactionBody?.recipient
  		}))
  	};
  }

  /**
   * Format Transaction
   * @param transactionDTO
   * @returns readable transactionDTO object
   */
  static formatTransaction = transaction => ({
  	...transaction,
  	deadline: helper.convertDeadlinetoDate(transaction.deadline.value),
  	maxFee: helper.toNetworkCurrency(transaction.maxFee),
  	signer: transaction.signer.address.plain(),
  	transactionBody: this.formatTransactionBody(transaction),
  	transactionInfo: this.formatTransactionInfo(transaction.transactionInfo)
  })

  /**
   * Format Different Type of Transaction such as TransferTransaction
   * @param TransactionDTO
   * @returns readable TransactionBody object
   */
  static formatTransactionBody = transactionBody => {
  	switch (transactionBody.type) {
  	case TransactionType.TRANSFER:
  		return {
  			transactionType: transactionBody.type,
  			recipient: transactionBody.recipientAddress,
  			mosaics: transactionBody.mosaics.map(mosaic => ({
  				...mosaic,
  				id: mosaic.id.toHex(),
  				amount: mosaic.amount.compact().toString()
  			})),
  			message: transactionBody.message.payload
  		};

  	case TransactionType.NAMESPACE_REGISTRATION:
  		let parentIdHex = transactionBody.parentId ? transactionBody.parentId.toHex() : '';

  		let duration = transactionBody.duration ? transactionBody.duration.compact() : 0;

  		return {
  			transactionType: transactionBody.type,
  			recipient: http.networkConfig.NamespaceRentalFeeSinkAddress.address,
  			registrationType: Constants.NamespaceRegistrationType[transactionBody.registrationType],
  			namespaceName: transactionBody.namespaceName,
  			namespaceId: transactionBody.namespaceId.toHex(),
  			parentId: parentIdHex === '' ? Constants.Message.UNAVAILABLE : parentIdHex,
  			duration: duration === 0 ? Constants.Message.UNLIMITED : duration
  		};

  	case TransactionType.ADDRESS_ALIAS:
  		return {
  			transactionType: transactionBody.type,
  			aliasAction: Constants.AliasAction[transactionBody.aliasAction],
  			namespaceId: transactionBody.namespaceId.toHex(),
  			namespaceName: transactionBody.namespaceId.fullName,
  			address: transactionBody.address.address
  		};

  	case TransactionType.MOSAIC_ALIAS:
  		return {
  			transactionType: transactionBody.type,
  			aliasAction: Constants.AliasAction[transactionBody.aliasAction],
  			namespaceId: transactionBody.namespaceId.id.toHex(),
  			namespaceName: transactionBody.namespaceId.fullName,
  			mosaicId: transactionBody.mosaicId.id.toHex()
  		};

  	case TransactionType.MOSAIC_DEFINITION:
  		return {
  			transactionType: transactionBody.type,
  			recipient: http.networkConfig.MosaicRentalSinkAddress.address,
  			mosaicId: transactionBody.mosaicId.toHex(),
  			divisibility: transactionBody.divisibility,
  			duration: transactionBody.duration.compact(),
  			nonce: transactionBody.nonce.toHex(),
  			supplyMutable: transactionBody.flags.supplyMutable,
  			transferable: transactionBody.flags.transferable,
  			restrictable: transactionBody.flags.restrictable
  		};

  	case TransactionType.MOSAIC_SUPPLY_CHANGE:
  		return {
  			transactionType: transactionBody.type,
  			mosaicId: transactionBody.mosaicId.id.toHex(),
  			action: Constants.MosaicSupplyChangeAction[transactionBody.action],
  			delta: transactionBody.delta.compact()
  		};

  	case TransactionType.MULTISIG_ACCOUNT_MODIFICATION:
  		return {
  			transactionType: transactionBody.type,
  			minApprovalDelta: transactionBody.minApprovalDelta,
  			minRemovalDelta: transactionBody.minRemovalDelta,
  			addressAdditions: transactionBody.addressAdditions.map(address => address.address),
  			addressDeletions: transactionBody.addressDeletions.map(address => address.address)
  		};

  	case TransactionType.AGGREGATE_COMPLETE:
  		return {
  			transactionType: transactionBody.type,
  			innerTransactions: transactionBody.innerTransactions.map(transaction => this.formatTransaction(transaction)),
  			cosignatures: transactionBody.cosignatures.map(cosigner => ({
  				...cosigner,
  				signer: cosigner.signer.address.address
  			}))
  		};

  	case TransactionType.AGGREGATE_BONDED:
  		return {
  			transactionType: transactionBody.type,
  			innerTransactions: transactionBody.innerTransactions.map(transaction => this.formatTransaction(transaction)),
  			cosignatures: transactionBody.cosignatures.map(cosigner => ({
  				...cosigner,
  				signer: cosigner.signer.address.address
  			}))
  		};

  	case TransactionType.HASH_LOCK:
  		return {
  			transactionType: transactionBody.type,
  			duration: transactionBody.duration.compact(),
  			mosaicId: transactionBody.mosaic.id.toHex(),
  			amount: helper.toNetworkCurrency(transactionBody.mosaic.amount),
  			hash: transactionBody.hash
  		};

  	case TransactionType.SECRET_LOCK:
  		return {
  			transactionType: transactionBody.type,
  			duration: transactionBody.duration.compact(),
  			mosaicId: transactionBody.mosaic.id.toHex(),
  			amount: helper.toNetworkCurrency(transactionBody.mosaic.amount),
  			secret: transactionBody.secret,
  			recipient: transactionBody.recipientAddress,
  			hashAlgorithm: Constants.LockHashAlgorithm[transactionBody.hashAlgorithm]
  		};

  	case TransactionType.SECRET_PROOF:
  		return {
  			transactionType: transactionBody.type,
  			hashAlgorithm: Constants.LockHashAlgorithm[transactionBody.hashAlgorithm],
  			recipient: transactionBody.recipientAddress,
  			secret: transactionBody.secret,
  			proof: transactionBody.proof
  		};
  	case TransactionType.ACCOUNT_ADDRESS_RESTRICTION:
  		return {
  			transactionType: transactionBody.type,
  			restrictionType: Constants.AddressRestrictionFlag[transactionBody.restrictionFlags],
  			restrictionAddressAdditions: transactionBody.restrictionAdditions.map(restriction => {
  				if (restriction instanceof Address)
  					return restriction.address;

  				return restriction.fullName;
  			}),
  			restrictionAddressDeletions: transactionBody.restrictionDeletions.map(restriction => {
  				if (restriction instanceof Address)
  					return restriction.address;

  				return restriction.fullName;
  			})
  		};

  	case TransactionType.ACCOUNT_MOSAIC_RESTRICTION:
  		return {
  			transactionType: transactionBody.type,
  			restrictionType: Constants.MosaicRestrictionFlag[transactionBody.restrictionFlags],
  			restrictionMosaicAdditions: transactionBody.restrictionAdditions.map(mosaic => mosaic.id.toHex()),
  			restrictionMosaicDeletions: transactionBody.restrictionDeletions.map(mosaic => mosaic.id.toHex())
  		};

  	case TransactionType.ACCOUNT_OPERATION_RESTRICTION:
  		return {
  			transactionType: transactionBody.type,
  			restrictionType: Constants.OperationRestrictionFlag[transactionBody.restrictionFlags],
  			restrictionOperationAdditions: transactionBody.restrictionAdditions.map(operation => operation),
  			restrictionOperationDeletions: transactionBody.restrictionDeletions.map(operation => operation)
  		};

  	case TransactionType.MOSAIC_ADDRESS_RESTRICTION:
  		return {
  			transactionType: transactionBody.type,
  			mosaicId: transactionBody.mosaicId.toHex(),
  			targetAddress: transactionBody.targetAddress,
  			restrictionKey: transactionBody.restrictionKey.toHex(),
  			previousRestrictionValue: transactionBody.previousRestrictionValue.toString(),
  			newRestrictionValue: transactionBody.newRestrictionValue.toString()
  		};

  	case TransactionType.MOSAIC_GLOBAL_RESTRICTION:
  		return {
  			transactionType: transactionBody.type,
  			referenceMosaicId: transactionBody.referenceMosaicId.toHex() === '0000000000000000' ? transactionBody.mosaicId.toHex() : transactionBody.referenceMosaicId.toHex(),
  			restrictionKey: transactionBody.restrictionKey.toHex(),
  			previousRestrictionType: Constants.MosaicRestrictionType[transactionBody.previousRestrictionType],
  			previousRestrictionValue: transactionBody.previousRestrictionValue.compact(),
  			newRestrictionType: Constants.MosaicRestrictionType[transactionBody.newRestrictionType],
  			newRestrictionValue: transactionBody.newRestrictionValue.compact()
  		};

  	case TransactionType.ACCOUNT_METADATA:
  		return {
  			transactionType: transactionBody.type,
  			scopedMetadataKey: transactionBody.scopedMetadataKey.toHex(),
  			targetAddress: transactionBody.targetAddress.address,
  			metadataValue: transactionBody.value,
  			valueSizeDelta: transactionBody.valueSizeDelta
  		};

  	case TransactionType.MOSAIC_METADATA:
  		return {
  			transactionType: transactionBody.type,
  			scopedMetadataKey: transactionBody.scopedMetadataKey.toHex(),
  			targetMosaicId: transactionBody.targetMosaicId.toHex(),
  			targetAddress: transactionBody.targetAddress.address,
  			metadataValue: transactionBody.value,
  			valueSizeDelta: transactionBody.valueSizeDelta
  		};

  	case TransactionType.NAMESPACE_METADATA:
  		return {
  			transactionType: transactionBody.type,
  			scopedMetadataKey: transactionBody.scopedMetadataKey.toHex(),
  			targetNamespaceId: transactionBody.targetNamespaceId.toHex(),
  			targetAddress: transactionBody.targetAddress.address,
  			metadataValue: transactionBody.value,
  			valueSizeDelta: transactionBody.valueSizeDelta
  		};
  	case TransactionType.VOTING_KEY_LINK:
		  return {
  			transactionType: transactionBody.type,
  			linkAction: Constants.LinkAction[transactionBody.linkAction],
  			linkedPublicKey: transactionBody.linkedPublicKey,
  			linkedAccountAddress: Address.createFromPublicKey(transactionBody.linkedPublicKey, http.networkType).plain(),
  			startEpoch: transactionBody.startEpoch,
  			endEpoch: transactionBody.endEpoch
  		};
  	case TransactionType.VRF_KEY_LINK:
  	case TransactionType.NODE_KEY_LINK:
  	case TransactionType.ACCOUNT_KEY_LINK:
  		return {
  			transactionType: transactionBody.type,
  			linkAction: Constants.LinkAction[transactionBody.linkAction],
  			linkedPublicKey: transactionBody.linkedPublicKey,
  			linkedAccountAddress: Address.createFromPublicKey(transactionBody.linkedPublicKey, http.networkType).plain()
  		};
  	}
  }

  /**
   * Format transactionInfoDTO
   * @param transactionInfoDTO
   * @returns readable transactionInfoDTO object
   */
  static formatTransactionInfo = transactionInfo => {
  	if (transactionInfo instanceof TransactionInfo) {
  		return {
  			...transactionInfo,
  			height: transactionInfo.height.compact()
  		};
  	}

  	if (transactionInfo instanceof AggregateTransactionInfo) {
  		return {
  			...transactionInfo
  		};
  	}

  	return {};
  }

  /**
   * Build standalone transanction object for Vue components.
   * @param transactionDTO - transaction dto from SDK
   * @returns tranasctionObj
   */
  static createStandaloneTransactionFromSDK = async transactionDTO => {
	  const transactionObj = {
		  ...transactionDTO,
		  transactionType: transactionDTO.type,
		  deadline: helper.convertDeadlinetoDate(transactionDTO.deadline.value),
		  maxFee: helper.toNetworkCurrency(transactionDTO.maxFee),
		  signer: transactionDTO.signer.address.plain(),
		  transactionInfo: this.formatTransactionInfo(transactionDTO.transactionInfo)
	  };

  	switch (transactionDTO.type) {
  	case TransactionType.TRANSFER:
  		return CreateTransaction.transferTransaction(transactionObj);
  	case TransactionType.NAMESPACE_REGISTRATION:
  		return CreateTransaction.namespaceRegistration(transactionObj);
  	case TransactionType.ADDRESS_ALIAS:
  		return CreateTransaction.addressAlias(transactionObj);
  	case TransactionType.MOSAIC_ALIAS:
  		return CreateTransaction.mosaicAlias(transactionObj);
  	case TransactionType.MOSAIC_DEFINITION:
  		return CreateTransaction.mosaicDefinition(transactionObj);
  	case TransactionType.MOSAIC_SUPPLY_CHANGE:
  		return CreateTransaction.mosaicSupplyChange(transactionObj);
  	case TransactionType.MULTISIG_ACCOUNT_MODIFICATION:
  		return CreateTransaction.multisigAccountModification(transactionObj);
  	case TransactionType.HASH_LOCK:
  		return CreateTransaction.hashLock(transactionObj);
  	case TransactionType.SECRET_LOCK:
  		return CreateTransaction.secretLock(transactionObj);
  	case TransactionType.SECRET_PROOF:
  		return CreateTransaction.secretProof(transactionObj);
  	case TransactionType.ACCOUNT_ADDRESS_RESTRICTION:
  		return CreateTransaction.accountAddressRestriction(transactionObj);
  	case TransactionType.ACCOUNT_MOSAIC_RESTRICTION:
  		return CreateTransaction.accountMosaicRestriction(transactionObj);
  	case TransactionType.ACCOUNT_OPERATION_RESTRICTION:
  		return CreateTransaction.accountOperationRestriction(transactionObj);
  	case TransactionType.MOSAIC_ADDRESS_RESTRICTION:
  		return CreateTransaction.mosaicAddressRestriction(transactionObj);
  	case TransactionType.MOSAIC_GLOBAL_RESTRICTION:
  		return CreateTransaction.mosaicGlobalRestriction(transactionObj);
  	case TransactionType.ACCOUNT_METADATA:
  		return CreateTransaction.accountMetadata(transactionObj);
  	case TransactionType.MOSAIC_METADATA:
  		return CreateTransaction.mosaicMetadata(transactionObj);
  	case TransactionType.VOTING_KEY_LINK:
  		return CreateTransaction.votingKeyLink(transactionObj);
  	case TransactionType.VRF_KEY_LINK:
  		return CreateTransaction.vrfKeyLink(transactionObj);
  	case TransactionType.NODE_KEY_LINK:
  		return CreateTransaction.nodeKeyLink(transactionObj);
  	case TransactionType.ACCOUNT_KEY_LINK:
  		return CreateTransaction.accountKeyLink(transactionObj);
  	default:
  		throw new Error('Unimplemented transaction with type ' + transactionDTO.type);
	  }
  }

  /**
   * Build transanction object for Vue components.
   * @param transactionDTO - transaction dto from SDK
   * @returns tranasctionObj
   */
  static createTransactionFromSDK = async (transactionDTO) => {
	  if (transactionDTO.type === TransactionType.AGGREGATE_BONDED || transactionDTO.type === TransactionType.AGGREGATE_COMPLETE) {
  		const innerTransactions = transactionDTO.innerTransactions ? await Promise.all(transactionDTO.innerTransactions.map(async (transaction, index) => {
  			return {
  				index: index + 1,
  				...await this.createStandaloneTransactionFromSDK(transaction)
  			};
  		})) : [];

  		return {
			  ...transactionDTO,
			  innerTransactions,
			  cosignatures: transactionDTO.cosignatures ? transactionDTO.cosignatures.map(cosignature => {
				  return {
					  ...cosignature,
					  signature: cosignature.signature,
					  signer: cosignature.signer.address.plain()
				  };
			  }) : [],
			  deadline: helper.convertDeadlinetoDate(transactionDTO.deadline.value),
			  maxFee: helper.toNetworkCurrency(transactionDTO.maxFee),
			  signer: transactionDTO.signer.address.plain(),
			  transactionInfo: this.formatTransactionInfo(transactionDTO.transactionInfo),
			  transactionBody: {
  				transactionType: transactionDTO.type
			  }
		  };
	  }

	  return this.createStandaloneTransactionFromSDK(transactionDTO);
  }
}

export default TransactionService;
