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

import Vue from 'vue'
import App from './App.vue'
import router from './router'
import './filters'
import store from './store'
import TopHead from '@/components/TopHead.vue'
import PageMenu from './components/menu/PageMenu.vue'
import Pagefooter from '@/components/PageFooter.vue'
import TimeSince from '@/components/TimeSince.vue'
import Loading from '@/components/Loading.vue'
import TableListView from '@/components/tables/TableListView.vue'
import TableInfoView from '@/components/tables/TableInfoView.vue'

window.Vue = Vue
Vue.config.productionTip = false
Vue.component('top-header', TopHead)
Vue.component('page-menu', PageMenu)
Vue.component('page-footer', Pagefooter)
Vue.component('time-since', TimeSince)
Vue.component('loader', Loading)
Vue.component('TableListView', TableListView)
Vue.component('TableInfoView', TableInfoView)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
