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

import http from './http'
import helper from '../helper'
import Constants from '../config/constants'
import { DataService, ChainService } from '../infrastructure'
import { Address, QueryParams } from 'symbol-sdk'

class NamespaceService {
  /**
   * Gets array of NamespaceName for different namespaceIds
   * @param namespaceIds - Array of namespace ids
   * @returns Formatted NamespaceName[]
   */
  static getNamespacesName = async (namespaceIds) => {
    let namespaceNames = await http.createRepositoryFactory.createNamespaceRepository()
      .getNamespacesName(namespaceIds).toPromise()
    let formattedNamespacesName = namespaceNames.map(namespaceName => this.formatNamespaceName(namespaceName))

    return formattedNamespacesName
  }

  /**
   * Get readable names for a set of mosaics Returns friendly names for mosaics.
   * @param mosaicIds - Array of mosaic ids
   * @returns MosaicNames[]
   */
  static getMosaicsNames = async (mosaicIds) => {
    const mosaicNames = await http.createRepositoryFactory.createNamespaceRepository()
      .getMosaicsNames(mosaicIds).toPromise()
    const formattedMosaicNames = mosaicNames.map(mosaicName => this.formatMosaicName(mosaicName))

    return formattedMosaicNames
  }

  /**
   * Returns friendly names for array of addresses.
   * @param addresses - Array of addresses
   * @returns AccountNames[]
   */
  static getAccountsNames = async (addresses) => {
    const accountNames = await http.createRepositoryFactory.createNamespaceRepository()
      .getAccountsNames(addresses).toPromise()

    const formattedAccountNames = accountNames.map(accountName => this.formatAccountName(accountName))

    return formattedAccountNames
  }

  /**
   * Gets array of Namespace for an account
   * @param address - string of address
   * @param pageSize - (default 10) no. of data
   * @param id — (Optional) retrive next namespace in pagination
   * @returns customize Namespace[]
   */
  static getNamespacesFromAccount = async (address, pageSize = 10, id = '') => {
    const namespacesFromAccount = await http.createRepositoryFactory.createNamespaceRepository()
      .getNamespacesFromAccount(Address.createFromRawAddress(address), new QueryParams({ pageSize, id }))
      .toPromise()

    // Convert NamespaceInfo to Namespace
    const namespaces = await this.toNamespaces(namespacesFromAccount)

    const formattedNamespaces = namespaces.map(namespace => this.formatNamespace(namespace))

    return formattedNamespaces
  }

  /**
   * Get namespace info and name from namespace Id
   * @param namespaceId - Namespace id
   * @returns formatted namespace info and name
   */
  static getNamespace = async (namespaceId) => {
    let namespace = await http.namespaceService.namespace(namespaceId).toPromise()
    let formattedNamespace = this.formatNamespace(namespace)

    return formattedNamespace
  }

  /**
   * Get namespace info for Vue Component
   * @param hexOrNamespace - hex value or namespace name
   * @returns customize namespace info Object
   */
  static getNamespaceInfo = async (hexOrNamespace) => {
    let namespaceId = await helper.hexOrNamespaceToId(hexOrNamespace, 'namespace')
    let namespace = await this.getNamespace(namespaceId)
    const currentHeight = await ChainService.getBlockchainHeight()
    let {
      isExpired,
      expiredInBlock,
      expiredInSecond
    } = helper.calculateNamespaceExpiration(currentHeight, namespace.endHeight)

    let formattedNamespaceInfo = {
      ...namespace,
      owneraddress: namespace.owner,
      duration: helper.convertTimeFromNowInSec(expiredInSecond) || Constants.Message.UNLIMITED,
      status: namespace.active
    }

    // create alias props by alias type.
    if (namespace.aliasType === Constants.Message.ADDRESS)
      formattedNamespaceInfo.aliasAddress = namespace.alias

    if (namespace.aliasType === Constants.Message.MOSAIC)
      formattedNamespaceInfo.aliasMosaic = namespace.alias

    // End height disable click before expired.
    formattedNamespaceInfo.expiredInBlock = Constants.NetworkConfig.NAMESPACE.indexOf(namespace.namespaceName.toUpperCase()) !== -1 ? Constants.Message.INFINITY : expiredInBlock + ` ≈ ` + formattedNamespaceInfo.duration

    if (!isExpired) {
      formattedNamespaceInfo.beforeEndHeight = Constants.NetworkConfig.NAMESPACE.indexOf(namespace.namespaceName.toUpperCase()) !== -1 ? Constants.Message.INFINITY : formattedNamespaceInfo.endHeight + ` ( ${Constants.NetworkConfig.NAMESPACE_GRACE_PERIOD_DURATION} blocks of grace period )`
      delete formattedNamespaceInfo.endHeight
    }

    return formattedNamespaceInfo
  }

  /**
   * Gets NamespaceName list from Vue Component
   * @param hexOrNamespace - hex value or namespace name
   * @returns Namespace name list
   */
  static getNamespaceLevelList = async (hexOrNamespace) => {
    let namespaceId = await helper.hexOrNamespaceToId(hexOrNamespace, 'namespace')
    let namespacesName = await this.getNamespacesName([namespaceId])

    return namespacesName
  }

  /**
   * Get customize NamespaceInfo dataset into Vue Component
   * @param limit — No of namespaceInfo
   * @param fromNamespaceId — (Optional) retrive next namespace in pagination
   * @returns customize NamespaceInfo[]
   */
  static getNamespaceList = async (limit, fromNamespaceId) => {
    const namespaceInfos = await DataService.getNamespacesFromIdWithLimit(limit, fromNamespaceId)

    // Convert NamespaceInfo[] to Namespace[]
    const namespaces = await this.toNamespaces(namespaceInfos)

    const formattedNamespaces = namespaces.map(namespace => this.formatNamespace(namespace))

    const currentHeight = await ChainService.getBlockchainHeight()

    return formattedNamespaces.map(formattedNamespace => {
      const { isExpired, expiredInSecond, expiredInBlock } = helper.calculateNamespaceExpiration(currentHeight, formattedNamespace.endHeight)

      return {
        ...formattedNamespace,
        owneraddress: formattedNamespace.owner,
        duration: helper.convertTimeFromNowInSec(expiredInSecond) || Constants.Message.UNLIMITED,
        isExpired: isExpired,
        approximateExpired: helper.convertSecondToDate(expiredInSecond),
        expiredInBlock: expiredInBlock
      }
    })
  }

  /**
   * Get customize Namespace dataset for Vue component.
   * @param address - string of address
   * @param namespaceId — (Optional) retrive next namespace in pagination
   * @returns customizeize Namespace[]
   */
  static getNamespacesFromAccountList = async (address, pageSize, namesapceId) => {
    const namespacesFromAccountInfos = await this.getNamespacesFromAccount(address, pageSize, namesapceId)

    const currentHeight = await ChainService.getBlockchainHeight()

    return namespacesFromAccountInfos.map(namespacesFromAccountInfo => {
      const { expiredInSecond } = helper.calculateNamespaceExpiration(currentHeight, namespacesFromAccountInfo.endHeight)
      return {
        ...namespacesFromAccountInfo,
        status: namespacesFromAccountInfo.active,
        duration: helper.convertTimeFromNowInSec(expiredInSecond) || Constants.Message.UNLIMITED
      }
    })
  }

  /**
   * Convert NamespaceInfo[] to Namespace[]
   * @param NamespaceInfo[] - array of NamespaceInfo
   * @returns Namespace[]
   */
  static toNamespaces = async (namespaceInfos) => {
    const namespaceIdsList = namespaceInfos.map(namespaceInfo => namespaceInfo.id)
    const namespaceNames = await this.getNamespacesName(namespaceIdsList)

    return namespaceInfos.map(namespaceInfo => ({
      ...namespaceInfo,
      id: namespaceInfo.id,
      name: this.extractFullNamespace(namespaceInfo, namespaceNames)
    }))
  }

  /**
   * Format namespaceName to readable object
   * @param namespaceNameDTO
   * @returns readable namespaceNameDTO
   */
  static formatNamespaceName = namespaceName => ({
    ...namespaceName,
    namespaceId: namespaceName.namespaceId.toHex(),
    parentId: namespaceName?.parentId ? namespaceName.parentId.toHex() : Constants.Message.UNAVAILABLE
  })

  /**
   * Format alias to readable object
   * @param Alias
   * @returns readable Alias object
   */
  static formatAlias = alias => {
    switch (alias.type) {
    case 0:
      return {
        ...alias,
        aliasType: Constants.Message.UNAVAILABLE
      }
    case 1: // Mosaic id alias
      return {
        ...alias,
        aliasType: Constants.Message.MOSAIC,
        alias: alias?.mosaicId.toHex()
      }
    case 2: // Address alias
      return {
        ...alias,
        aliasType: Constants.Message.ADDRESS,
        alias: alias?.address.plain()
      }
    }
  }

  /**
   * Format namespace to readable object
   * @param namespace - namespace DTO
   * @returns readable namespaceDTO
   */
  static formatNamespace = namespace => ({
    ...namespace,
    owner: namespace.owner.address.plain(),
    namespaceName: namespace.name,
    namespaceId: namespace.id.toHex(),
    registrationType: Constants.NamespaceRegistrationType[namespace.registrationType],
    startHeight: namespace.startHeight.compact(),
    endHeight: Constants.NetworkConfig.NAMESPACE.indexOf(namespace.name.toUpperCase()) !== -1
      ? Constants.Message.INFINITY
      : namespace.endHeight.compact(),
    active: namespace.active ? Constants.Message.ACTIVE : Constants.Message.INACTIVE,
    ...this.formatAlias(namespace.alias),
    parentName: namespace.registrationType !== 0 ? namespace.name.split('.')[0].toUpperCase() : '',
    levels: namespace.levels
  })

  /**
   * Format mosaic name to readable object
   * @param mosaicName - mosaicName DTO
   * @returns readable mosaicName DTO
   */
  static formatMosaicName = mosaicName => ({
    ...mosaicName,
    mosaicId: mosaicName.mosaicId.toHex()
  })

  /**
   * Format account name to readable object
   * @param accountName - accountName DTO
   * @returns readable accountName DTO
   */
  static formatAccountName = accountName => ({
    ...accountName,
    address: accountName.address.plain(),
    names: accountName.names.map(name => this.formatNamespaceName(name))
  })

  /**
   * Extract full name for Namespace
   * @param namespaceInfo - namespaceInfo DTO
   * @param namespaceNames - NamespaceName[]
   * @returns full name
   */
  static extractFullNamespace = (namespaceInfo, namespaceNames) => {
    return namespaceInfo.levels.map((level) => {
      const namespaceName = namespaceNames.find((name) => name.namespaceId === level.toHex())

      if (namespaceName === undefined) throw new Error('Not found')
      return namespaceName
    })
      .map((namespaceName) => namespaceName.name)
      .join('.')
  }
}

export default NamespaceService
