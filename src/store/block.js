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

import util from './util'
import sdkBlock from '../infrastructure/getBlock'
import sdkListener from '../infrastructure/getListener'

export default {
  namespaced: true,
  state: {
    // Holds the latest PAGE_SIZE blocks.
    latestList: [],
    // Holds the PAGE_SIZE blocks starting from current page.
    pageList: [],
    // The current page index (0-indexed).
    pageIndex: 0,
    // Subscription to new blocks.
    subscription: null,
    // Determine if the blocks model is loading.
    loading: false
  },
  getters: {
    getLatestList: util.getLatestList,
    getRecentList: util.getRecentList,
    getPageList: util.getPageList,
    getPageIndex: util.getPageIndex,
    getSubscription: util.getSubscription,
    getLoading: util.getLoading
  },
  mutations: {
    setLatestList: util.setLatestList,
    setPageList: util.setPageList,
    setPageIndex: util.setPageIndex,
    setSubscription: util.setSubscription,
    setLoading: util.setLoading,
    resetPageIndex: util.resetPageIndex,
    addLatestItem(state, item) {
      util.addLatestItemByKey(state, item, 'height', 1)
    }
  },
  actions: {
    // Initialize the block model.
    // First fetch the page, then subscribe.
    async initialize({ dispatch }) {
      await dispatch('initializePage')
      await dispatch('subscribe')
    },

    // Uninitialize the block model.
    uninitialize({ dispatch }) {
      dispatch('unsubscribe')
    },

    // Subscribe to the latest blocks.
    async subscribe({ commit, dispatch, getters }) {
      if (getters.getSubscription === null) {
        let subscription = await sdkListener.subscribeNewBlock(dispatch)
        commit('setSubscription', subscription)
      }
    },

    // Unsubscribe from the latest blocks.
    unsubscribe({ commit, getters }) {
      let subscription = getters.getSubscription
      if (subscription !== null) {
        subscription[1].unsubscribe()
        subscription[0].close()
        commit('setSubscription', null)
      }
    },

    // Add block to latest blocks.
    add({ commit }, item) {
      commit('chain/setBlockHeight', item.height, { root: true })
      commit('addLatestItem', item)
    },

    // Fetch data from the SDK and initialize the page.
    async initializePage({ commit }) {
      commit('setLoading', true)
      let blockList = await sdkBlock.getBlocksWithLimit(util.PAGE_SIZE)
      commit('setPageList', blockList)
      if (blockList.length > 0) {
        commit('chain/setBlockHeight', blockList[0].height, { root: true })
      }
      commit('setLoading', false)
    },

    // Fetch the next page of data.
    async fetchNextPage({ commit, getters }) {
      commit('setLoading', true)
      const pageList = getters.getPageList
      const pageIndex = getters.getPageIndex
      if (pageList.length > 0) {
        // Page is loaded, need to fetch next page.
        const index = pageList.length - 1
        const earliestBlock = pageList[index]
        const fromBlockHeight = earliestBlock.height - 1
        let blockList = await sdkBlock.getBlocksWithLimit(util.PAGE_SIZE, fromBlockHeight)
        commit('setPageIndex', pageIndex + 1)
        commit('setPageList', blockList)
      }
      commit('setLoading', false)
    },

    // Fetch the previous page of data.
    async fetchPreviousPage({ commit, getters }) {
      commit('setLoading', true)
      const pageList = getters.getPageList
      const pageIndex = getters.getPageIndex
      if (pageIndex === 1) {
        // Can specialize for the latest list.
        commit('setPageList', getters.getLatestList)
        commit('setPageIndex', 0)
      } else if (pageIndex > 0 && pageList.length > 0) {
        // Page is loaded, not the first page, need to fetch previous page.
        // We don't have a better way, so increment the page size until we have
        // a way to specify the max block height.
        const latestBlock = pageList[0]
        const fromBlockHeight = latestBlock.height + util.PAGE_SIZE
        let blockList = await sdkBlock.getBlocksWithLimit(util.PAGE_SIZE, fromBlockHeight)
        commit('setPageList', blockList)
        commit('setPageIndex', pageIndex - 1)
      }
      commit('setLoading', false)
    },

    // Reset the block page to the latest list (index 0)
    resetPage({ commit, getters }) {
      if (getters.getPageIndex > 0) {
        commit('setPageList', getters.getLatestList)
        commit('resetPageIndex')
      }
    }
  }
}
