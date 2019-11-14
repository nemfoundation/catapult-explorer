import { Address, TransactionType, NetworkType } from 'nem2-sdk'
import { Constants } from './config'
import moment from 'moment'

// FORMAT FEE

// Convert micro-xem (smallest unit) to XEM.
const microxemToXem = amount => amount / Math.pow(10, 6)

// Format fee (in microxem) to string (in XEM).
const formatFee = fee => microxemToXem(fee.compact()).toString()

// FORMAT BLOCK

const formatBlocks = (blockList) => {
    return blockList.map(block => {
        return formatBlock(block)
    })
}

const formatBlock = (block) => {
    let blockObj = {
        height: block.height.compact(),
        hash: block.hash,
        timestamp: block.timestamp.compact() / 1000 + 1459468800,
        date: moment.utc(
            (block.timestamp.compact() / 1000 + 1459468800) * 1000
        ).local().format('YYYY-MM-DD HH:mm:ss'),
        totalFee: formatFee(block.totalFee),
        difficulty: (block.difficulty.compact() / 1000000000000).toFixed(2),
        numTransactions: block.numTransactions ? block.numTransactions : 0,
        signature: block.signature,
        signer: block.signer,
        previousBlockHash: block.previousBlockHash,
        blockTransactionsHash: block.blockTransactionsHash,
        blockReceiptsHash: block.blockReceiptsHash,
        stateHash: block.stateHash
    }

    return blockObj
}

// FORMAT ACCOUNT
const formatAccount = (accountInfo, accountName) => {
    // Calculate the importance score.
    let importanceScore = accountInfo.importance.compact()
    if (importanceScore) {
        importanceScore /= 90000
        importanceScore = importanceScore.toFixed(4).split('.')
        importanceScore = importanceScore[0] + '.' + importanceScore[1]
    }

    // Process the account activity.
    let lastActivity
    let harvestedBlocks
    let harvestedFees
    if (accountInfo.activityBucket.length > 0) {
        const bucketList = accountInfo.activityBucket
        const length = bucketList.length
        const bucket = bucketList[length - 1]
        lastActivity = parseInt(bucket.startHeight, 10)
        harvestedBlocks = length
        harvestedFees = bucketList.reduce((x, y) => x + parseInt(y.totalFeesPaid, 10), 0)
    } else {
        lastActivity = 1
        harvestedBlocks = 0
        harvestedFees = 0
    }

    const accountObj = {
        meta: accountInfo.meta,
        address: accountInfo.address,
        addressHeight: accountInfo.addressHeight.compact(),
        publicKey: accountInfo.publicKey,
        publicKeyHeight: accountInfo.publicKeyHeight.compact(),
        mosaics: formatMosaics(accountInfo.mosaics),
        importance: importanceScore,
        importanceHeight: accountInfo.importanceHeight.compact(),
        accountType: Constants.AccountType[accountInfo.accountType],
        activityBucket: accountInfo.activityBucket,
        linkedAccountKey: accountInfo.linkedAccountKey,
        lastActivity: lastActivity,
        harvestedBlocks: harvestedBlocks,
        harvestedFees: harvestedFees
    }

    if (accountName.names.length > 0) {
        accountObj.accountAliasName = accountName.names[0].name
        accountObj.accountAliasNameHex = accountName.names[0].namespaceId.toHex()
    }

    return accountObj
}

// FORMAT MultiSig Account

const formatAccountMultisig = accountMultisig => {
    const accountMultisigObj = {
        ...accountMultisig,
        cosignatories: accountMultisig.cosignatories.map(cosigner => ({
            address: cosigner.address.plain(),
            publicKey: cosigner.publicKey
        }))
    }
    return accountMultisigObj
}

// FORMAT MOSAICS
const formatMosaics = mosaics => {
    return mosaics.map(mosaic => {
        return {
            ...mosaic,
            id: mosaic.id.toHex(),
            amount: mosaic.amount.compact()
        }
    })
}

// FORMAT MOSAICS INFO
const formatMosaicInfo = mosaicInfo => ({
    mosaic: mosaicInfo.id.toHex(),
    divisibility: mosaicInfo.divisibility,
    address: mosaicInfo.owner.address.plain(),
    supply: mosaicInfo.supply.compact(),
    revision: mosaicInfo.revision,
    startHeight: mosaicInfo.height.compact(),
    duration: mosaicInfo.duration.compact(),
    supplyMutable: mosaicInfo.flags.supplyMutable,
    transferable: mosaicInfo.flags.transferable,
    restrictable: mosaicInfo.flags.restrictable
})

const formatMosaicInfos = mosaicInfos => {
    return mosaicInfos.map(mosaicInfo => {
        return formatMosaicInfo(mosaicInfo)
    })
}

// FORMAT TRANSACTIONS
const formatTransactions = transactions => {
    return transactions.map(transaction => {
        return formatTransaction(transaction)
    })
}

// FORMAT TRANSACTION
const formatTransaction = transaction => {
    let transactionObj = {
        deadline: moment.utc(new Date(transaction.deadline.value)).local().format(
            'YYYY-MM-DD HH:mm:ss'
        ),
        fee: formatFee(transaction.maxFee),
        signature: transaction.signature,
        signer: transaction.signer.address.plain(),
        blockHeight: transaction.transactionInfo.height.compact(),
        transactionHash: transaction.transactionInfo.hash,
        transactionId: transaction.transactionInfo.id,
        transactionBody: formatTransactionBody(transaction)
    }

    return transactionObj
}

// FORMAT AggregateCosignatures
const formatCosignatures = cosignatures => {
    cosignatures.map(cosigner => {
        cosigner.signer = cosigner.signer.address.address
    })

    return cosignatures
}

// FORMAT TRANSACTION BODY
const formatTransactionBody = transactionBody => {
    switch (transactionBody.type) {
        case TransactionType.TRANSFER:
            let transferObj = {
                type: Constants.TransactionType[TransactionType.TRANSFER],
                typeId: TransactionType.TRANSFER,
                recipient: transactionBody.recipientAddress.address,
                mosaics: formatMosaics(transactionBody.mosaics),
                message: transactionBody.message.payload
            }
            return transferObj
        case TransactionType.REGISTER_NAMESPACE:
            let parentIdHex = transactionBody.parentId ? transactionBody.parentId.toHex() : ''
            let duration = transactionBody.duration ? transactionBody.duration.compact() : 0

            let registerNamespaceObj = {
                type: Constants.TransactionType[TransactionType.REGISTER_NAMESPACE],
                typeId: TransactionType.REGISTER_NAMESPACE,
                recipient: Constants.NetworkConfig.NAMESPACE_RENTAL_FEE_SINK_ADDRESS,
                registrationType: Constants.NamespaceRegistrationType[transactionBody.registrationType],
                namespaceName: transactionBody.namespaceName,
                namespaceId: transactionBody.namespaceId.toHex(),
                parentId: parentIdHex === '' ? Constants.Message.UNAVAILABLE : parentIdHex,
                duration: duration === 0 ? Constants.Message.UNLIMITED : duration
            }
            return registerNamespaceObj
        case TransactionType.ADDRESS_ALIAS:
            let addressAliasObj = {
                type: Constants.TransactionType[TransactionType.ADDRESS_ALIAS],
                typeId: TransactionType.ADDRESS_ALIAS,
                aliasAction: Constants.AliasAction[transactionBody.actionType],
                namespaceId: transactionBody.namespaceId.toHex()
            }
            return addressAliasObj

        case TransactionType.MOSAIC_ALIAS:
            let mosaicAlias = {
                type: Constants.TransactionType[TransactionType.MOSAIC_ALIAS],
                typeId: TransactionType.MOSAIC_ALIAS,
                aliasAction: Constants.AliasAction[transactionBody.aliasAction],
                namespaceId: transactionBody.namespaceId.id.toHex(),
                mosaicId: transactionBody.mosaicId.id.toHex()
            }
            return mosaicAlias
        case TransactionType.MOSAIC_DEFINITION:
            let mosaicDefinitionObj = {
                type: Constants.TransactionType[TransactionType.MOSAIC_DEFINITION],
                typeId: TransactionType.MOSAIC_DEFINITION,
                recipient: Constants.NetworkConfig.MOSAIC_RENTAL_FEE_SINK_ADDRESS,
                mosaicId: transactionBody.mosaicId.toHex(),
                divisibility: transactionBody.divisibility,
                duration: transactionBody.duration,
                nonce: transactionBody.nonce,
                supplyMutable: transactionBody.flags.supplyMutable,
                transferable: transactionBody.flags.transferable,
                restrictable: transactionBody.flags.restrictable
            }
            return mosaicDefinitionObj
        case TransactionType.MOSAIC_SUPPLY_CHANGE:
            let mosaicSupplyChangeObj = {
                type: Constants.TransactionType[TransactionType.MOSAIC_SUPPLY_CHANGE],
                typeId: TransactionType.MOSAIC_SUPPLY_CHANGE,
                mosaicId: transactionBody.mosaicId.id.toHex(),
                action: Constants.MosaicSupplyChangeAction[transactionBody.action],
                delta: transactionBody.delta.compact()
            }
            return mosaicSupplyChangeObj
        case TransactionType.MODIFY_MULTISIG_ACCOUNT:
            let modifyMultisigAccountObj = {
                type: Constants.TransactionType[TransactionType.MODIFY_MULTISIG_ACCOUNT],
                typeId: TransactionType.MODIFY_MULTISIG_ACCOUNT,
                minApprovalDelta: transactionBody.minApprovalDelta,
                minRemovalDelta: transactionBody.minRemovalDelta,
                modifications: transactionBody.modifications
            }
            return modifyMultisigAccountObj

        case TransactionType.AGGREGATE_COMPLETE:
            let aggregateCompleteObj = {
                type: Constants.TransactionType[TransactionType.AGGREGATE_COMPLETE],
                typeId: TransactionType.AGGREGATE_COMPLETE,
                innerTransactions: formatTransactions(transactionBody.innerTransactions),
                cosignatures: formatCosignatures(transactionBody.cosignatures)
            }
            return aggregateCompleteObj
        case TransactionType.AGGREGATE_BONDED:
            let aggregateBondedObj = {
                type: Constants.TransactionType[TransactionType.AGGREGATE_BONDED],
                typeId: TransactionType.AGGREGATE_BONDED,
                innerTransactions: formatTransactions(transactionBody.innerTransactions),
                cosignatures: formatCosignatures(transactionBody.cosignatures)
            }
            return aggregateBondedObj

        case TransactionType.LOCK:
            let lockObj = {
                type: Constants.TransactionType[TransactionType.LOCK],
                typeId: TransactionType.LOCK,
                duration: transactionBody.duration.compact(),
                mosaicId: transactionBody.mosaic.id.toHex(),
                amount: formatFee(transactionBody.mosaic.amount)
            }
            return lockObj
        case TransactionType.SECRET_LOCK:
            let secretLockObj = {
                type: Constants.TransactionType[TransactionType.SECRET_LOCK],
                typeId: TransactionType.SECRET_LOCK,
                duration: transactionBody.duration.compact(),
                mosaicId: transactionBody.mosaic.id.toHex(),
                secret: transactionBody.secret,
                recipient: transactionBody.recipientAddress.address,
                hashType: Constants.HashType[transactionBody.hashType]
            }
            return secretLockObj
        case TransactionType.SECRET_PROOF:
            let secretProofObj = {
                type: Constants.TransactionType[TransactionType.SECRET_PROOF],
                typeId: TransactionType.SECRET_PROOF
            }
            return secretProofObj
        case TransactionType.ACCOUNT_RESTRICTION_ADDRESS:
            let accountRestrictionAddressObj = {
                type: Constants.TransactionType[TransactionType.ACCOUNT_RESTRICTION_ADDRESS],
                typeId: TransactionType.ACCOUNT_RESTRICTION_ADDRESS
            }
            return accountRestrictionAddressObj
        case TransactionType.ACCOUNT_RESTRICTION_MOSAIC:
            let accountRestrictionMosaicObj = {
                type: Constants.TransactionType[TransactionType.ACCOUNT_RESTRICTION_MOSAIC],
                typeId: TransactionType.ACCOUNT_RESTRICTION_MOSAIC
            }
            return accountRestrictionMosaicObj
        case TransactionType.ACCOUNT_RESTRICTION_OPERATION:
            let accountRestrictionOperationObj = {
                type: Constants.TransactionType[TransactionType.ACCOUNT_RESTRICTION_OPERATION],
                typeId: TransactionType.ACCOUNT_RESTRICTION_OPERATION
            }
            return accountRestrictionOperationObj
        case TransactionType.LINK_ACCOUNT:
            let linkAccountObj = {
                type: Constants.TransactionType[TransactionType.LINK_ACCOUNT],
                typeId: TransactionType.LINK_ACCOUNT,
                linkAction: Constants.LinkAction[transactionBody.linkAction],
                remoteAccountPublicKey: transactionBody.remotePublicKey,
                remoteAccountAddress: Address.createFromPublicKey(transactionBody.remotePublicKey, NetworkType.MIJIN_TEST).plain()
            }
            return linkAccountObj
        case TransactionType.MOSAIC_ADDRESS_RESTRICTION:
            let mosaicAddressRestrictionObj = {
                type: Constants.TransactionType[TransactionType.MOSAIC_ADDRESS_RESTRICTION],
                typeId: TransactionType.MOSAIC_ADDRESS_RESTRICTION
            }
            return mosaicAddressRestrictionObj
        case TransactionType.MOSAIC_GLOBAL_RESTRICTION:
            let mosaicGlobalRestrictionObj = {
                type: Constants.TransactionType[TransactionType.MOSAIC_GLOBAL_RESTRICTION],
                typeId: TransactionType.MOSAIC_GLOBAL_RESTRICTION
            }
            return mosaicGlobalRestrictionObj
        case TransactionType.ACCOUNT_METADATA_TRANSACTION:
            let accountMetadataTransactionObj = {
                type: Constants.TransactionType[TransactionType.ACCOUNT_METADATA_TRANSACTION],
                typeId: TransactionType.ACCOUNT_METADATA_TRANSACTION
            }
            return accountMetadataTransactionObj
        case TransactionType.MOSAIC_METADATA_TRANSACTION:
            let mosaicMetadataTransactionObj = {
                type: Constants.TransactionType[TransactionType.MOSAIC_METADATA_TRANSACTION],
                typeId: TransactionType.MOSAIC_METADATA_TRANSACTION
            }
            return mosaicMetadataTransactionObj
        case TransactionType.NAMESPACE_METADATA_TRANSACTION:
            let namespaceMetadataTransactionObj = {
                type: Constants.TransactionType[TransactionType.NAMESPACE_METADATA_TRANSACTION],
                typeId: TransactionType.NAMESPACE_METADATA_TRANSACTION
            }
            return namespaceMetadataTransactionObj
    }
}

// FORMAT NAMESPACES
const formatNamespaces = namespacesInfo =>
    namespacesInfo
        .filter((ns, index, namespaces) => {
            for (let i = 0; i < index; i += 1) {
                if (ns === namespaces[i]) {
                    return false
                }
            }
            return true
        })
        .sort((a, b) => {
            const nameA = a.namespaceInfo.metaId
            const nameB = b.namespaceInfo.metaId
            if (nameA < nameB) {
                return -1
            }
            if (nameA > nameB) {
                return 1
            }
            return 0
        })
        .map((ns, index, original) => {
            const name = ns.namespaceInfo.levels
                .map(level => original.find(n => n.namespaceInfo.id.equals(level)))
                .map(n => n.namespaceName.name)
                .join('.')
            let aliasText
            let aliasType
            switch (ns.namespaceInfo.alias.type) {
                case 1:
                    aliasText = ns.namespaceInfo.alias.mosaicId.toHex()
                    aliasType = Constants.Message.MOSAIC
                    break
                case 2:
                    aliasText = ns.namespaceInfo.alias.address
                    aliasType = Constants.Message.ADDRESS
                    break
                default:
                    aliasText = false
                    aliasType = Constants.Message.NO_ALIAS
                    break
            }
            return {
                owner: ns.namespaceInfo.owner,
                namespaceName: name,
                hexId: ns.namespaceInfo.id.toHex(),
                type: Constants.NamespaceRegistrationType[ns.namespaceInfo.registrationType],
                aliastype: aliasType,
                alias: aliasText,
                aliasAction: Constants.AliasAction[ns.namespaceInfo.alias.type],
                currentAliasType: ns.namespaceInfo.alias.type,

                active: ns.namespaceInfo.active ? Constants.Message.ACTIVE : Constants.Message.INACTIVE,
                startHeight: ns.namespaceInfo.startHeight.compact(),
                endHeight: name.toUpperCase() === Constants.NetworkConfig.NAMESPACE
                    ? Constants.Message.INFINITY
                    : ns.namespaceInfo.endHeight.compact(),
                parentId: ns.namespaceInfo.parentId.id.toHex()
            }
        })

// FORMAT NAMESPACE
const formatNamespace = (namespaceInfo, namespaceNames) => {
    let aliasText
    let aliasType
    switch (namespaceInfo.alias.type) {
        case 1:
            aliasText = namespaceInfo.alias.mosaicId.toHex()
            aliasType = Constants.Message.MOSAIC
            break
        case 2:
            aliasText = namespaceInfo.alias.address.plain()
            aliasType = Constants.Message.ADDRESS
            break
        default:
            aliasText = false
            aliasType = Constants.Message.NO_ALIAS
            break
    }

    let namespaceObj = {
        owner: namespaceInfo.owner.address.plain(),
        namespaceName: namespaceNames[0].name,
        namespaceNameHexId: namespaceInfo.id.toHex().toUpperCase(),
        registrationType: Constants.NamespaceRegistrationType[namespaceInfo.registrationType],
        startHeight: namespaceInfo.startHeight.compact(),
        endHeight: namespaceNames[0].name.toUpperCase() === Constants.NetworkConfig.NAMESPACE
            ? Constants.Message.INFINITY
            : namespaceInfo.endHeight.compact(),
        active: namespaceInfo.active ? Constants.Message.ACTIVE : Constants.Message.INACTIVE,
        aliasType: aliasType,
        alias: aliasText || aliasType,
        // parentHexId: namespaceInfo.parentId.id.toHex().toUpperCase(),
        parentName:
      namespaceInfo.registrationType !== 0 ? namespaceNames[0].name.split('.')[0].toUpperCase() : '',
        levels: namespaceNames
    }

    return namespaceObj
}

const formatNamespaceInfo = namespaceInfo => ({
    active: namespaceInfo.active ? Constants.Message.ACTIVE : Constants.Message.INACTIVE,
    namespaceId: namespaceInfo.id.toHex(),
    namespaceName: namespaceInfo.namespaceName,
    index: namespaceInfo.index,
    registrationType: Constants.NamespaceRegistrationType[namespaceInfo.registrationType],
    depth: namespaceInfo.depth,
    levels: namespaceInfo.levels,
    parentId: namespaceInfo.parentId.toHex() === '0000000000000000' ? Constants.Message.UNAVAILABLE : namespaceInfo.parentId.toHex(),
    address: namespaceInfo.owner.address.plain(),
    startHeight: namespaceInfo.startHeight.compact()
})

const formatNamespaceInfos = namespaceInfos => {
    return namespaceInfos.map(namespaceInfo => {
        return formatNamespaceInfo(namespaceInfo)
    })
}

export default {
    formatBlocks,
    formatBlock,
    formatAccount,
    formatAccountMultisig,
    formatMosaics,
    formatTransactions,
    formatTransaction,
    formatTransactionBody,
    formatNamespaces,
    formatNamespace,
    formatMosaicInfo,
    formatMosaicInfos,
    formatNamespaceInfo,
    formatNamespaceInfos
}
