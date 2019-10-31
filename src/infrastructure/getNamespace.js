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

import axios from 'axios'
import { Address, NamespaceId } from 'nem2-sdk'
import { mergeMap, map } from 'rxjs/operators'
import dto from './dto'
import http from './http'
import format from '../format'
import helper from '../helper'
import Constants from '../config/constants'

class sdkNamespace {
  static getNamespacesFromAccountByAddress = async (address) => {
    const namespacesIds = []
    const namespaceList = await http.namespace
      .getNamespacesFromAccount(Address.createFromRawAddress(address))
      .pipe(
        mergeMap(namespacesInfo => {
          const namespaceIds = namespacesInfo.map(x => {
            namespacesIds[x.id.toHex().toUpperCase()] = { namespaceInfo: x }
            return x.id
          })
          return http.namespace.getNamespacesName(namespaceIds)
        }),
        map(namespacesNames =>
          namespacesNames.map(namespaceName => {
            const namespace =
              namespacesIds[namespaceName.namespaceId.toHex().toUpperCase()]
            namespace.namespaceName = namespaceName
            return namespace
          })
        )
      )
      .toPromise()

    return format.formatNamespaces(namespaceList)
  }

  static getNamespaceInfo = async namespaceOrHex => {
    let namespace = ''

    if (helper.isHexadecimal(namespaceOrHex)) {
      namespace = NamespaceId.createFromEncoded(namespaceOrHex)
    } else {
      namespace = new NamespaceId(namespaceOrHex)
    }

    let namespaceInfo = await http.namespaceService.namespace(namespace).toPromise()
    let namespaceNames = await http.namespace.getNamespacesName([namespace]).toPromise()

    namespaceNames.map(namespace => {
      if (namespace.parentId) {
        let parent = namespaceNames.find(n => n.namespaceId.id.equals(namespace.parentId.id))
        namespace.name = parent.name + '.' + namespace.name
      }
      namespace.namespaceId = namespace.namespaceId.toHex()
    })

    return format.formatNamespace(namespaceInfo, namespaceNames)
  }

  static getNamespacesFromIdWithLimit = async (limit, fromNamespaceId) => {
    let namespaceId
    if (fromNamespaceId === undefined) {
      namespaceId = 'latest'
    } else {
      namespaceId = fromNamespaceId
    }

    // Make request.
    const networkType = await http.network.getNetworkType().toPromise()
    const path = `/namespaces/from/${namespaceId}/limit/${limit}`
    const response = await axios.get(http.nodeUrl + path)
    const namespaces = response.data.map(info => dto.createNamespaceInfoFromDTO(info, networkType))

    return format.formatNamespaceInfos(namespaces)
  }

  static getNamespacesSinceIdWithLimit = async (limit, sinceNamespaceId) => {
    let namespaceId
    if (sinceNamespaceId === undefined) {
      namespaceId = 'earliest'
    } else {
      namespaceId = sinceNamespaceId
    }

    // Make request.
    const networkType = await http.network.getNetworkType().toPromise()
    const path = `/namespaces/since/${namespaceId}/limit/${limit}`
    const response = await axios.get(http.nodeUrl + path)
    const namespaces = response.data.map(info => dto.createNamespaceInfoFromDTO(info, networkType))

    return format.formatNamespaceInfos(namespaces)
  }

  static getNamespaceInfoFormatted = async namespaceOrHex => {
    let namespaceInfo
    let namespaceLevels
    let namespaceInfoFormatted

    try { namespaceInfo = await sdkNamespace.getNamespaceInfo(namespaceOrHex) } catch (e) { throw Error('Failed to fetch namespace info', e) }

    if (namespaceInfo) {
      namespaceInfoFormatted = {
        owneraddress: namespaceInfo.owner,
        namespaceName: namespaceInfo.namespaceName,
        namespaceId: namespaceInfo.namespaceNameHexId,
        registrationType: namespaceInfo.registrationType,
        startHeight: namespaceInfo.startHeight,
        endHeight: namespaceInfo.endHeight,
        active: namespaceInfo.active,
        aliasType: namespaceInfo.aliasType,
        alias: namespaceInfo.alias
      }

      namespaceLevels = []
      if (namespaceInfo.levels?.length) {
        namespaceInfo.levels.forEach((el) => {
          let parentId = el.parentId ? el.parentId : ''
          let namespaceLevelObject = {
            name: el.name,
            namespaceId: el.namespaceId,
            parentId: parentId === '' ? Constants.Message.UNAVAILABLE : parentId.toHex()
          }
          namespaceLevels.push(namespaceLevelObject)
        })
      }
    }

    return {
      namespaceInfo: namespaceInfoFormatted || {},
      namespaceLevels: namespaceLevels || []
    }
  }
}

export default sdkNamespace
