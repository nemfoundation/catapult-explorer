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
    NamespaceId
} from 'symbol-sdk';
import Constants from '../config/constants';
import http from './http';
import helper from '../helper';
import {
    BlockService,
    DataService,
    NamespaceService,
    MosaicService
} from '../infrastructure';

class TransactionService {
  /**
   * Gets a transaction status for a transaction hash
   * @param hash Transaction id or hash
   * @returns TransactionStatus object
   */
  static getTransactionStatus = (hash) => {
      return new Promise((resolve, reject) => {
          let transactionStatus = {
              message: null,
              detail: {}
          };

          http.createRepositoryFactory.createTransactionRepository()
              .getTransactionStatus(hash)
              .toPromise()
              .then(response => {
                  transactionStatus.message = response.group;
                  transactionStatus.detail = response;
                  resolve(transactionStatus);
              })
              .catch(error => {
                  if (error.statusCode === 404)
                      reject(error);
                  transactionStatus.message = error.errorDetails.message;
                  transactionStatus.detail = error.body;
                  resolve(transactionStatus);
              });
      });
  }

  /**
   * Gets a transaction from hash or transaction Id
   * @param hash Transaction id or hash
   * @returns formatted Transaction
   */
  static getTransaction = async (hash) => {
      const transaction = await http.createRepositoryFactory.createTransactionRepository()
          .getTransaction(hash)
          .toPromise();

      return this.formatTransaction(transaction);
  }

  /**
   * Gets a transaction's effective paid fee
   * @param hash Transaction id or hash
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
   * @param hash Transaction id or hash
   * @returns Custom Transaction object
   */
  static getTransactionInfo = async hash => {
      let formattedTransaction = await this.getTransaction(hash);

      let { date } = await BlockService.getBlockInfo(formattedTransaction.transactionInfo.height);

      let effectiveFee = await this.getTransactionEffectiveFee(hash);

      const transactionStatus = await this.getTransactionStatus(hash);

      switch (formattedTransaction.type) {
      case TransactionType.TRANSFER:
          await Promise.all(formattedTransaction.mosaics.map(async mosaic => {
              if (mosaic.id instanceof NamespaceId) {
                  return (mosaic.id = await http.createRepositoryFactory.createNamespaceRepository().getLinkedMosaicId(mosaic.id)
                      .toPromise());
              }
          }));

          const mosaicIdsList = formattedTransaction.mosaics.map(mosaicInfo => mosaicInfo.id);
          const mosaicInfos = await MosaicService.getMosaics(mosaicIdsList);
          const mosaicNames = await NamespaceService.getMosaicsNames(mosaicIdsList);

          const transferMosaics = formattedTransaction.mosaics.map(mosaic => {
              let divisibility = mosaicInfos.find(info => info.mosaicId === mosaic.id.toHex()).divisibility;

              return {
                  ...mosaic,
                  mosaicId: mosaic.id.toHex(),
                  amount: helper.formatMosaicAmountWithDivisibility(mosaic.amount, divisibility),
                  mosaicAliasName: MosaicService.extractMosaicNamespace({ mosaicId: mosaic.id.toHex() }, mosaicNames)
              };
          });

          formattedTransaction.transferMosaics = transferMosaics;
          delete formattedTransaction.transactionBody.mosaics;
          break;
      case TransactionType.AGGREGATE_COMPLETE:
      case TransactionType.AGGREGATE_BONDED:
          const innerTransactions = formattedTransaction.aggregateTransaction.innerTransactions.map(transaction => ({
              ...transaction,
              transactionId: transaction.id,
              type: Constants.TransactionType[transaction.type]
          }));

          formattedTransaction.aggregateTransaction.innerTransactions = innerTransactions;

          delete formattedTransaction.transactionBody.innerTransactions;
          delete formattedTransaction.transactionBody.cosignatures;
          break;
      case TransactionType.ADDRESS_ALIAS:
      case TransactionType.MOSAIC_ALIAS:
          const namespaceName = await NamespaceService.getNamespacesName([NamespaceId.createFromEncoded(formattedTransaction.transactionBody.namespaceId)]);

          formattedTransaction.transactionBody.namespaceName = namespaceName[0].name;
          break;
      }

      const transactionInfo = {
          ...formattedTransaction,
          blockHeight: formattedTransaction.height,
          transactionHash: formattedTransaction.hash,
          transactionId: formattedTransaction.id,
          effectiveFee,
          date,
          status: transactionStatus.detail.code,
          confirm: transactionStatus.message
      };

      return transactionInfo;
  }

  /**
   * Gets array of transactions
   * @param limit - No of transaction
   * @param transactionType - filter transction type
   * @param fromHash - (Optional) retrive next transactions in pagination
   * @returns Formatted tranctionDTO[]
   */
  static getTransactionList = async (limit, transactionType, fromHash) => {
      const transactions = await DataService.getTransactionsFromHashWithLimit(limit, transactionType, fromHash);
      const formatted = transactions.map(transaction => this.formatTransaction(transaction));

      return formatted.map(transaction => ({
          ...transaction,
          height: transaction.height,
          transactionHash: transaction.hash,
          type: transaction.transactionBody.type,
          transactionDescriptor: transaction.transactionBody.transactionDescriptor,
          recipient: transaction.transactionBody?.recipient
      }));
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
      ...this.formatTransactionInfo(transaction.transactionInfo),
      transactionBody: this.formatTransactionBody(transaction),
      aggregateTransaction: {
          ...this.formatTransactionBody(transaction)
      }
  })

  /**
   * Format recipientAddressDTO
   * @param recipientAddressDTO
   * @returns NamespaceId.full | address
   */
  static formatRecipientAddress = recipientAddress => {
      if (recipientAddress instanceof NamespaceId)
          return recipientAddress.fullName | recipientAddress.id.toHex();

      return recipientAddress.address;
  }

  /**
   * Format Different Type of Transaction such as TransferTransaction
   * @param TransactionDTO
   * @returns readable TransactionBody object
   */
  static formatTransactionBody = transactionBody => {
      switch (transactionBody.type) {
      case TransactionType.TRANSFER:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              recipient: this.formatRecipientAddress(transactionBody.recipientAddress),
              mosaics: transactionBody.mosaics.map(mosaic => ({ // Todo Format mosaic
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
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              recipient: Address.createFromPublicKey(http.networkConfig.NamespaceRentalSinkPublicKey, http.networkType).plain(),
              registrationType: Constants.NamespaceRegistrationType[transactionBody.registrationType],
              namespaceName: transactionBody.namespaceName,
              namespaceId: transactionBody.namespaceId.toHex(),
              parentId: parentIdHex === '' ? Constants.Message.UNAVAILABLE : parentIdHex,
              duration: duration === 0 ? Constants.Message.UNLIMITED : duration
          };

      case TransactionType.ADDRESS_ALIAS:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              aliasAction: Constants.AliasAction[transactionBody.aliasAction],
              namespaceId: transactionBody.namespaceId.toHex(),
              namespaceName: transactionBody.namespaceId.fullName
          };

      case TransactionType.MOSAIC_ALIAS:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              aliasAction: Constants.AliasAction[transactionBody.aliasAction],
              namespaceId: transactionBody.namespaceId.id.toHex(),
              namespaceName: transactionBody.namespaceId.fullName,
              mosaicId: transactionBody.mosaicId.id.toHex()
          };

      case TransactionType.MOSAIC_DEFINITION:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              recipient: Address.createFromPublicKey(http.networkConfig.MosaicRentalSinkPublicKey, http.networkType).plain(),
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
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              mosaicId: transactionBody.mosaicId.id.toHex(),
              action: Constants.MosaicSupplyChangeAction[transactionBody.action],
              delta: transactionBody.delta.compact()
          };

      case TransactionType.MULTISIG_ACCOUNT_MODIFICATION:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              minApprovalDelta: transactionBody.minApprovalDelta,
              minRemovalDelta: transactionBody.minRemovalDelta,
              publicKeyAdditions: transactionBody.publicKeyAdditions.map(publicKey => publicKey.address.plain()),
              publicKeyDeletions: transactionBody.publicKeyDeletions.map(publicKey => publicKey.address.plain())
          };

      case TransactionType.AGGREGATE_COMPLETE:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              innerTransactions: transactionBody.innerTransactions.map(transaction => this.formatTransaction(transaction)),
              cosignatures: transactionBody.cosignatures.map(cosigner => ({
                  ...cosigner,
                  signer: cosigner.signer.address.address
              }))
          };

      case TransactionType.AGGREGATE_BONDED:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              innerTransactions: transactionBody.innerTransactions.map(transaction => this.formatTransaction(transaction)),
              cosignatures: transactionBody.cosignatures.map(cosigner => ({
                  ...cosigner,
                  signer: cosigner.signer.address.address
              }))
          };

      case TransactionType.HASH_LOCK:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              duration: transactionBody.duration.compact(),
              mosaicId: transactionBody.mosaic.id.toHex(), // Todo Format Mosaic
              amount: helper.toNetworkCurrency(transactionBody.mosaic.amount)
          };

      case TransactionType.SECRET_LOCK:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              duration: transactionBody.duration.compact(),
              mosaicId: transactionBody.mosaic.id.toHex(), // Todo Format Mosaic
              secret: transactionBody.secret,
              recipient: this.formatRecipientAddress(transactionBody.recipientAddress),
              hashAlgorithm: Constants.LockHashAlgorithm[transactionBody.hashAlgorithm]
          };

      case TransactionType.SECRET_PROOF:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              hashAlgorithm: Constants.LockHashAlgorithm[transactionBody.hashAlgorithm],
              recipient: this.formatRecipientAddress(transactionBody.recipientAddress),
              secret: transactionBody.secret,
              proof: transactionBody.proof
          };
      case TransactionType.ACCOUNT_ADDRESS_RESTRICTION:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
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
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              restrictionType: Constants.MosaicRestrictionFlag[transactionBody.restrictionFlags],
              restrictionMosaicAdditions: transactionBody.restrictionAdditions.map(mosaic => mosaic.id.toHex()),
              restrictionMosaicDeletions: transactionBody.restrictionDeletions.map(mosaic => mosaic.id.toHex())
          };

      case TransactionType.ACCOUNT_OPERATION_RESTRICTION:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              restrictionType: Constants.OperationRestrictionFlag[transactionBody.restrictionFlags],
              restrictionOperationAdditions: transactionBody.restrictionAdditions.map(operation => Constants.TransactionType[operation]),
              restrictionOperationDeletions: transactionBody.restrictionDeletions.map(operation => Constants.TransactionType[operation])
          };

      case TransactionType.MOSAIC_ADDRESS_RESTRICTION:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              mosaicId: transactionBody.mosaicId.toHex(), // Todo format mosaic
              targetAddress: this.formatRecipientAddress(transactionBody.targetAddress),
              restrictionKey: transactionBody.restrictionKey.toHex(),
              previousRestrictionValue: transactionBody.previousRestrictionValue.toString(),
              newRestrictionValue: transactionBody.newRestrictionValue.toString()
          };

      case TransactionType.MOSAIC_GLOBAL_RESTRICTION:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              referenceMosaicId: transactionBody.referenceMosaicId.toHex() === '0000000000000000' ? transactionBody.mosaicId.toHex() : transactionBody.referenceMosaicId.toHex(), // todo format Mosaic
              restrictionKey: transactionBody.restrictionKey.toHex(),
              previousRestrictionType: Constants.MosaicRestrictionType[transactionBody.previousRestrictionType],
              previousRestrictionValue: transactionBody.previousRestrictionValue.compact(),
              newRestrictionType: Constants.MosaicRestrictionType[transactionBody.newRestrictionType],
              newRestrictionValue: transactionBody.newRestrictionValue.compact()
          };

      case TransactionType.ACCOUNT_METADATA:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              scopedMetadataKey: transactionBody.scopedMetadataKey.toHex(),
              targetAddress: Address.createFromPublicKey(transactionBody.targetPublicKey, http.networkType).plain(),
              metadataValue: transactionBody.value,
              valueSizeDelta: transactionBody.valueSizeDelta
          };

      case TransactionType.MOSAIC_METADATA:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              scopedMetadataKey: transactionBody.scopedMetadataKey.toHex(),
              targetMosaicId: transactionBody.targetMosaicId.toHex(), // Todo Format mosaic
              targetAddress: Address.createFromPublicKey(transactionBody.targetPublicKey, http.networkType).plain(),
              metadataValue: transactionBody.value,
              valueSizeDelta: transactionBody.valueSizeDelta
          };

      case TransactionType.NAMESPACE_METADATA:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              transactionType: TransactionType.NAMESPACE_METADATA,
              scopedMetadataKey: transactionBody.scopedMetadataKey.toHex(),
              targetNamespaceId: transactionBody.targetNamespaceId.toHex(),
              targetAddress: Address.createFromPublicKey(transactionBody.targetPublicKey, http.networkType).plain(),
              metadataValue: transactionBody.value,
              valueSizeDelta: transactionBody.valueSizeDelta
          };
      case TransactionType.VOTING_KEY_LINK:
      case TransactionType.VRF_KEY_LINK:
      case TransactionType.NODE_KEY_LINK:
      case TransactionType.ACCOUNT_KEY_LINK:
          return {
              type: transactionBody.type,
              transactionDescriptor: 'transactionDescriptor_' + transactionBody.type,
              linkAction: Constants.LinkAction[transactionBody.linkAction],
              linkedPublicKey: transactionBody.linkedPublicKey
              // linkedAccountAddress: Address.createFromPublicKey(transactionBody.linkedPublicKey, http.networkType).plain()
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
}

export default TransactionService;
