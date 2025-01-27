<template>
	<div class="nodes-map">
		<div ref="map" :style="style"></div>
	</div>
</template>

<script>
import 'leaflet/dist/leaflet.css';
import leaflet from 'leaflet';
import markerCluster from 'leaflet.markercluster'; // eslint-disable-line
import IconOrange from '../styles/img/connector_orange.png';
import IconBlue from '../styles/img/connector_blue.png';
import IconBlueLight from '../styles/img/connector_blue_light.png';
import IconGreen from '../styles/img/connector_green.png';
import IconGreenLight from '../styles/img/connector_green_light.png';
import IconPink from '../styles/img/connector_pink.png';

export default {
	props: {
		nodes: {
			type: Array,
			default: () => []
		},

		height: {
			type: Number,
			default: 300
		},

		zoom: {
			type: Number,
			default: 1
		},

		minZoom: {
			type: Number,
			default: 1
		},

		showPopup: {
			type: Boolean
		}
	},

	mounted () {
		this.initialize();
		this.addMarkers();
	},

	data () {
		return {
			map: {}
		};
	},

	computed: {
		style () {
			return {
				height: this.height + 'px'
			};
		},

		buttonContainerStyle () {
			return `display: flex;
                justify-content: flex-end;
                margin: 15px 0;
            `;
		},

		button1Style () {
			return `border-radius: 3px;
                color: #fff;
                background-color: #5200c6;
                font-family: Noto Sans;
                font-weight: bold;
                font-size: 13px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 5px 10px;
                cursor: pointer;
                text-decoration: none;
            `;
		},

		button2Style () {
			return `border-radius: 3px;
                border-width: 2px;
                border-style: solid;
                border-color: #5200c6;
                color: #5200c6;
                background-color: #fff;
                font-family: Noto Sans;
                font-weight: bold;
                font-size: 13px;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 5px 10px;
                cursor: pointer;
                text-decoration: none;
                margin-left: 10px;
                display: none;
            `;
		}
	},

	methods: {
		initialize () {
			const southWest = leaflet.latLng(-89.98155760646617, -180);
			const northEast = leaflet.latLng(89.99346179538875, 180);
			const bounds = leaflet.latLngBounds(southWest, northEast);

			const map = leaflet.map(
				this.$refs.map,
				{
					center: [35, 0],
					minZoom: this.minZoom,
					zoom: this.zoom,
					maxBounds: bounds,
					zoomControl: false
				}
			);

			leaflet.tileLayer(
				// 'https://cartodb-basemaps-{s}.globaleaflet.ssleaflet.fastly.net/light_all/{z}/{x}/{y}.png',
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					subdomains: ['a', 'b', 'c']
				}
			).addTo(map);

			this.map = map;
		},

		addMarkers () {
			const getIcon = icon => {
				return leaflet.icon({
					iconUrl: icon,
					iconRetinaUrl: icon,
					iconSize: [46, 46],
					iconAnchor: [22, 23],
					popupAnchor: [1, -15]
				});
			};

			const iconPeer = getIcon(IconBlue);
			const iconPeerLight = getIcon(IconBlueLight);
			const iconVoting = getIcon(IconGreen);
			const iconVotingLight = getIcon(IconGreenLight);
			const iconApi = getIcon(IconPink);
			const iconApiVoting = getIcon(IconOrange);

			const markerClusters = leaflet.markerClusterGroup({
				// iconCreateFunction: this.createClusterGroup,
				maxClusterRadius: 30
			});

			for (const node of this.nodes) {
				const popup =
                    '<br/><span title="' + node.friendlyName + '"><b>' + this.getNameByKey('friendlyName') + ':</b> ' + this.formatText(node.friendlyName) +
                    '</span><br/><span title="' + node.host + '"><b>' + this.getNameByKey('host') + ':</b> ' + this.formatText(node.host) +
                    '</span><br/><span title="' + node.host + '"><b>' + this.getNameByKey('roles') + ':</b> ' + this.formatText(node.roles) +
                    '</span><br/><span title="' + node.network + '"><b>' + this.getNameByKey('network') + ':</b> ' + this.formatText(node.network) +
                    '</span><br/><span title="' + node.address + '"><b>' + this.getNameByKey('address') + ':</b> ' + this.formatText(node.address) +
                    '</span><br/><span title="' + node.location + '"><b>' + this.getNameByKey('location') + ':</b> ' + this.formatText(node.location) +
                    '</span><br/><span style="' + this.buttonContainerStyle + '">' +
                    '<a style="' + this.button1Style + '" href="' + this.getPageHref('node', node.publicKey) + '">' + this.getNameByKey('nodeDetailTitle') +
                    '</a><a style="' + this.button2Style + '" href="' + this.getPageHref('address', node.address) + '"> ' + this.getNameByKey('accountDetailTitle') + '</a>' +
                    '</span>';

				if (node.coordinates) {
					let icon = iconPeer;

					switch (node.rolesRaw) {
					case 1:
						icon = node.apiStatus?.isAvailable ? iconPeerLight : iconPeer;
						break;
					case 2:
					case 3:
						icon = iconApi;
						break;
					case 4:
					case 5:
						icon = node.apiStatus?.isAvailable ? iconVotingLight : iconVoting;
						break;
					case 6:
					case 7:
						icon = iconApiVoting;
						break;
					}

					const m = leaflet.marker([node.coordinates.latitude, node.coordinates.longitude], { icon });

					if (true === this.showPopup)
						m.bindPopup(popup);

					markerClusters.addLayer(m);
				}
			}

			this.map.addLayer(markerClusters);
		},

		createClusterGroup (cluster) {
			const count = cluster.getChildCount();

			let size = 'medium';

			if (5 > count)
				size = 'xs';
			else if (10 > count)
				size = 's';
			else if (20 > count)
				size = 'm';
			else if (40 > count)
				size = 'l';
			else if (80 > count)
				size = 'xl';
			else if (80 <= count)
				size = 'xxl';

			return leaflet.divIcon({
				html: count,
				className: `marker-cluster-${size}`// 'marker-cluster-base'
			});
		},

		formatText (value) {
			return 'string' === typeof value
				? (
					30 < value.length
						? (value.slice(0, 15) + '...' + value.slice(value.length - 14, value.length))
						: value
				)
				: 'n/a';
		},

		getNameByKey (e) {
			return this.$store.getters['ui/getNameByKey'](e);
		},

		getPageHref (itemKey, item) {
			return this.$store.getters['ui/getPageHref']({
				pageName: itemKey,
				param: item
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.nodes-map {
    width: 100%;
    height: 100%;
    max-height: 800px;

    .map {
        width: 100%;
        height: 100%;
    }
}
</style>
