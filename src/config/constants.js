import {
  TransactionType,
  MosaicSupplyChangeAction,
  NamespaceRegistrationType,
  AliasAction,
  LinkAction,
  AccountType,
  LockHashAlgorithm,
  NetworkType,
  MetadataType,
  ReceiptType,
  ResolutionType,
  RoleType,
  Deadline,
  AccountRestrictionFlags,
  MosaicRestrictionEntryType,
  MosaicRestrictionType
} from 'symbol-sdk'

class Constants {
  static PageSize = 25

  static Message = {
    UNLIMITED: 'UNLIMITED',
    UNAVAILABLE: 'N/A',
    INFINITY: 'INFINITY',
    MOSAIC: 'MOSAIC',
    ADDRESS: 'ADDRESS',
    NO_ALIAS: 'NO ALIAS',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
  }

  static NetworkConfig = {
    MOSAIC_RENTAL_FEE_SINK_PUBLIC_KEY: globalConfig.networkConfig.MosaicRentalSinkPublicKey,
    NAMESPACE_RENTAL_FEE_SINK_PUBLIC_KEY: globalConfig.networkConfig.NamespaceRentalSinkPublicKey,
    NAMESPACE: globalConfig.networkConfig.Namespace,
    NATIVE_MOSAIC_HEX: globalConfig.networkConfig.NativeMosaicHex,
    NATIVE_MOSAIC_DIVISIBILITY: globalConfig.networkConfig.NativeMosaicDivisibility,
    NETWORKTYPE: NetworkType[globalConfig.networkConfig.NetworkType],
    NEMESIS_TIMESTAMP: Deadline.timestampNemesisBlock,
    TARGET_BLOCK_TIME: globalConfig.networkConfig.TargetBlockTime,
    NAMESPACE_GRACE_PERIOD_DURATION: globalConfig.networkConfig.NamespaceGraceDuration,
    TOTAL_CHAIN_IMPORTANCE: globalConfig.networkConfig.TotalChainImportance
  }

  static TransactionType = {
    [TransactionType.TRANSFER]: 'Transfer',
    [TransactionType.NAMESPACE_REGISTRATION]: 'Namespace Registration',
    [TransactionType.ADDRESS_ALIAS]: 'Address Alias',
    [TransactionType.MOSAIC_ALIAS]: 'Mosaic Alias',
    [TransactionType.MOSAIC_DEFINITION]: 'Mosaic Definition',
    [TransactionType.MOSAIC_SUPPLY_CHANGE]: 'Mosaic Supply Change',
    [TransactionType.MULTISIG_ACCOUNT_MODIFICATION]: 'Multisig Account Modification',
    [TransactionType.AGGREGATE_COMPLETE]: 'Aggregate Complete',
    [TransactionType.AGGREGATE_BONDED]: 'Aggregate Bonded',
    [TransactionType.HASH_LOCK]: 'Hash Lock',
    [TransactionType.SECRET_LOCK]: 'Secret Lock',
    [TransactionType.SECRET_PROOF]: 'Secret Proof',
    [TransactionType.ACCOUNT_ADDRESS_RESTRICTION]: 'Account Address Restriction',
    [TransactionType.ACCOUNT_MOSAIC_RESTRICTION]: 'Account Mosaic Restriction',
    [TransactionType.ACCOUNT_OPERATION_RESTRICTION]: 'Account Operation Restriction',
    [TransactionType.ACCOUNT_LINK]: 'Account Link',
    [TransactionType.MOSAIC_ADDRESS_RESTRICTION]: 'Mosaic Address Restriction',
    [TransactionType.MOSAIC_GLOBAL_RESTRICTION]: 'Mosaic Global Restriction',
    [TransactionType.ACCOUNT_METADATA]: 'Account Metadata',
    [TransactionType.MOSAIC_METADATA]: 'Mosaic Metadata',
    [TransactionType.NAMESPACE_METADATA]: 'Namespace Metadata'
  }

  static MosaicSupplyChangeAction = {
    [MosaicSupplyChangeAction.Increase]: 'Increase',
    [MosaicSupplyChangeAction.Decrease]: 'Decrease'
  }

  static NamespaceRegistrationType = {
    [NamespaceRegistrationType.RootNamespace]: 'Root Namespace',
    [NamespaceRegistrationType.SubNamespace]: 'Sub Namespace'
  }

  static AliasAction = {
    [AliasAction.Link]: 'Link',
    [AliasAction.Unlink]: 'Unlink'
  }

  static LinkAction = {
    [LinkAction.Link]: 'Link',
    [LinkAction.Unlink]: 'Unlink'
  }

  static AccountType = {
    [AccountType.Unlinked]: 'Unlinked',
    [AccountType.Main]: 'Main',
    [AccountType.Remote]: 'Remote',
    [AccountType.Remote_Unlinked]: 'Remote Unlinked'
  }

  static LockHashAlgorithm = {
    [LockHashAlgorithm.Op_Sha3_256]: 'Op_Sha3_256',
    [LockHashAlgorithm.Op_Hash_160]: 'Op_Hash_160',
    [LockHashAlgorithm.Op_Hash_256]: 'Op_Hash_256'
  }

  static MetadataType = {
    [MetadataType.Account]: 'Account',
    [MetadataType.Mosaic]: 'Mosaic',
    [MetadataType.Namespace]: 'Namespace'
  }

  static ReceiptType = {
    [ReceiptType.Harvest_Fee]: 'Harvest Fee',
    [ReceiptType.LockHash_Created]: 'LockHash Created',
    [ReceiptType.LockHash_Completed]: 'LockHash Completed',
    [ReceiptType.LockHash_Expired]: 'LockHash Expired',
    [ReceiptType.LockSecret_Created]: 'LockSecret Created',
    [ReceiptType.LockSecret_Completed]: 'LockSecret Completed',
    [ReceiptType.LockSecret_Expired]: 'LockSecret Expired',
    [ReceiptType.Mosaic_Levy]: 'Mosaic Levy',
    [ReceiptType.Mosaic_Rental_Fee]: 'Mosaic Rental Fee',
    [ReceiptType.Namespace_Rental_Fee]: 'Namespace Rental Fee',
    [ReceiptType.Mosaic_Expired]: 'Mosaic Expired',
    [ReceiptType.Namespace_Expired]: 'Namespace Expired',
    [ReceiptType.Namespace_Deleted]: 'Namespace Deleted',
    [ReceiptType.Inflation]: 'Inflation'
  }

  static ResolutionType = {
    [ResolutionType.Address]: 'Address',
    [ResolutionType.Mosaic]: 'Mosaic'
  }

  static NetworkType = {
    [NetworkType.MAIN_NET]: 'MAINNET',
    [NetworkType.MIJIN]: 'MIJIN',
    [NetworkType.MIJIN_TEST]: 'MIJIN TESTNET',
    [NetworkType.TEST_NET]: 'TESTNET'
  }

  static RoleType = {
    [RoleType.ApiNode]: 'API NODE',
    [RoleType.PeerNode]: 'PEER NODE',
    [RoleType.DualNode]: 'DUAL NODE'
  }

  static AccountRestrictionFlags = {
    [AccountRestrictionFlags.AllowIncomingAddress]: 'Allow Incoming Address',
    [AccountRestrictionFlags.AllowMosaic]: 'Allow Mosaic',
    [AccountRestrictionFlags.AllowIncomingTransactionType]: 'Allow Incoming Transaction',
    [AccountRestrictionFlags.AllowOutgoingAddress]: 'Allow Outgoing Address',
    [AccountRestrictionFlags.AllowOutgoingTransactionType]: 'Allow Outgoing Transaction',
    [AccountRestrictionFlags.BlockIncomingAddress]: 'Block Incoming Address',
    [AccountRestrictionFlags.BlockMosaic]: 'Block Mosaic',
    [AccountRestrictionFlags.BlockIncomingTransactionType]: 'Block IncomingT Transaction',
    [AccountRestrictionFlags.BlockOutgoingAddress]: 'Block Outgoing Address',
    [AccountRestrictionFlags.BlockOutgoingTransactionType]: 'Block Outgoing Transaction'
  }

  static MosaicRestrictionEntryType = {
    [MosaicRestrictionEntryType.ADDRESS]: 'Mosaic address restriction',
    [MosaicRestrictionEntryType.GLOBAL]: 'Mosaic global restriction'
  }

  static MosaicRestrictionType = {
    [MosaicRestrictionType.EQ]: 'Allow Equal',
    [MosaicRestrictionType.GE]: 'Allow Greater Than Or Equal',
    [MosaicRestrictionType.GT]: 'Allow Greater Than',
    [MosaicRestrictionType.LE]: 'Allow Less Than Or Equal',
    [MosaicRestrictionType.LT]: 'Allow Less Than',
    [MosaicRestrictionType.NE]: 'Allow Not Equal',
    [MosaicRestrictionType.NONE]: 'No Restriction'
  }
}

export default Constants
