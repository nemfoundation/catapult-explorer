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

import Lock from './lock';
import Constants from '../config/constants';
import { TransactionService } from '../infrastructure';
import {
    Filter,
    DataSet,
    Timeline,
    getStateFromManagers,
    getGettersFromManagers,
    getMutationsFromManagers,
    getActionsFromManagers
} from './manager';

const managers = [
    new Timeline(
        'recent',
        () => TransactionService.getTransactionList(Constants.PageSize),
        (key, pageSize) => TransactionService.getTransactionList(pageSize, void 0, key),
        'transactionHash'
    ),
    new Timeline(
        'pending',
        () => TransactionService.getTransactionList(Constants.PageSize, 'unconfirmed'),
        (key, pageSize) => TransactionService.getTransactionList(pageSize, 'unconfirmed', key),
        'transactionHash'
    ),
    new Timeline(
        'transfer',
        () => TransactionService.getTransactionList(Constants.PageSize, 'transfer'),
        (key, pageSize) => TransactionService.getTransactionList(pageSize, 'transfer', key),
        'transactionHash'
    ),
    new Timeline(
        'multisig',
        () => TransactionService.getTransactionList(Constants.PageSize, 'transfer/multisig'),
        (key, pageSize) => TransactionService.getTransactionList(pageSize, 'transfer/multisig', key),
        'transactionHash'
    ),
    new Timeline(
        'mosaic',
        () => TransactionService.getTransactionList(Constants.PageSize, 'transfer/mosaic'),
        (key, pageSize) => TransactionService.getTransactionList(pageSize, 'transfer/mosaic', key),
        'transactionHash'
    ),
    new Filter(
        'timeline',
        {
            recent: 'Recent',
            pending: 'Pending Transactions',
            transfer: 'Transfer Transactions',
            multisig: 'Multisig Transactions',
            mosaic: 'Mosaic Transactions'
        }
    ),
    new DataSet(
        'info',
        (hash) => TransactionService.getTransactionInfo(hash)
    )
];

const LOCK = Lock.create();

export default {
    namespaced: true,
    state: {
        ...getStateFromManagers(managers),
        // If the state has been initialized.
        initialized: false
    },
    getters: {
        ...getGettersFromManagers(managers),
        getInitialized: state => state.initialized,
        getRecentList: state => state.recent?.data?.filter((item, index) => index < 4) || [],
        transactionInfo: state => state.info?.data?.transactionInfo || {},
        transactionDetail: state => state.info?.data?.transactionBody || {},
        transferMosaics: state => state.info?.data?.transferMosaics || [],
        aggregateInnerTransactions: state => state.info?.data?.aggregateTransaction?.innerTransactions || [],
        aggregateCosignatures: state => state.info?.data?.aggregateTransaction?.cosignatures || [],
        transactionSchema: (state, getters) => ({
            loading: getters.info.loading,
            error: getters.info.error,
            data: {
                ...getters.info.data,
                ...getters.transactionDetail,
                mosaics: getters.transferMosaics
            }
        })
    },
    mutations: {
        ...getMutationsFromManagers(managers),
        setInitialized: (state, initialized) => {
            state.initialized = initialized;
        }
    },
    actions: {
        ...getActionsFromManagers(managers),

        // Initialize the transaction model. First fetch the page, then subscribe.
        async initialize({ commit, dispatch, getters }) {
            const callback = async () => {
                await dispatch('initializePage');
                await dispatch('subscribe');
            };

            await LOCK.initialize(callback, commit, dispatch, getters);
        },

        // Uninitialize the transaction model.
        async uninitialize({ commit, dispatch, getters }) {
            const callback = async () => {
                dispatch('unsubscribe');
        getters.timeline?.uninitialize();
            };

            await LOCK.uninitialize(callback, commit, dispatch, getters);
        },

        // Subscribe to the latest transactions.
        async subscribe({ commit, dispatch, getters }) {
            // TODO(ahuszagh) Implement...
        },

        // Unsubscribe from the latest transactions.
        unsubscribe({ commit, getters }) {
            let subscription = getters.getSubscription;

            if (subscription?.length === 2) {
                subscription[1].unsubscribe();
                subscription[0].close();
                commit('setSubscription', null);
            }
        },

        // Add transaction to latest transactions.
        add({ commit }, item) {
            // TODO(ahuszagh) Also need to rework this.
            // Need to consider transaction type.
            //      commit('chain/setTransactionHash', item.transactionHash, { root: true })
            //      commit('addLatestItem', item)
        },

        // Fetch data from the SDK and initialize the page.
        initializePage(context) {
            context.getters.recent.setStore(context);
            context.getters.pending.setStore(context);
            context.getters.transfer.setStore(context);
            context.getters.multisig.setStore(context);
            context.getters.mosaic.setStore(context);
            context.getters.timeline.setStore(context).initialFetch();
        },

        getTransactionInfoByHash(context, payload) {
            context.dispatch('uninitializeDetail');
            context.getters.info.setStore(context).initialFetch(payload.transactionHash);
        },

        uninitializeDetail(context) {
            context.getters.info.setStore(context).uninitialize();
        }
    }
};
