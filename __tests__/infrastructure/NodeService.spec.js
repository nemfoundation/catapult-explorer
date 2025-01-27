import { NodeService } from '../../src/infrastructure';
import http from '../../src/infrastructure/http';
import TestHelper from '../TestHelper';

describe('Node Service', () => {
	// Arrange:
	const {
		generateNodePeerStatus,
		generateNodeApiStatus,
		nodeCommonField
	} = TestHelper;

	const statisticServiceNodeResponse = [
		{
			roles: 1,
			peerStatus: generateNodePeerStatus(true),
			...nodeCommonField
		},
		{
			roles: 2,
			apiStatus: generateNodeApiStatus(false),
			...nodeCommonField
		},
		{
			roles: 3,
			peerStatus: generateNodePeerStatus(true),
			apiStatus: generateNodeApiStatus(false),
			...nodeCommonField
		},
		{
			roles: 3,
			peerStatus: generateNodePeerStatus(true),
			apiStatus: generateNodeApiStatus(true),
			...nodeCommonField
		},
		{
			roles: 3,
			peerStatus: generateNodePeerStatus(false),
			apiStatus: generateNodeApiStatus(false),
			...nodeCommonField
		},
		{
			roles: 5,
			peerStatus: generateNodePeerStatus(true),
			...nodeCommonField
		},
		{
			roles: 5,
			peerStatus: generateNodePeerStatus(false),
			...nodeCommonField
		},
		{
			roles: 7,
			peerStatus: generateNodePeerStatus(true),
			apiStatus: generateNodeApiStatus(true),
			...nodeCommonField
		}
	];

	const nodeFormattedCommonField = {
		network: 'MAINNET',
		address: 'NDY2CXBR6SK3G7UWVXZT6YQTVJKHKFMPU74ZOYY',
		nodePublicKey:
			'016DC1622EE42EF9E4D215FA1112E89040DD7AED83007283725CE9BA550272F5',
		version: '1.0.3.5'
	};

	const runStatisticServiceFailResponseTests = (statisticServiceMethod, NodeServiceMethod) => {
		it('throws error when statistic services fail response', async () => {
			// Arrange:
			const error = new Error(`Statistics service ${statisticServiceMethod} error`);

			http.statisticServiceRestClient = jest.fn().mockImplementation(() => {
				return {
					[statisticServiceMethod]: jest.fn().mockRejectedValue(error)
				};
			});

			// Act + Assert:
			await expect(NodeService[NodeServiceMethod]()).rejects.toThrow(error);
		});
	};

	describe('getAvailableNodes', () => {
		it('returns available node from statistic services', async () => {
			// Arrange:
			http.statisticServiceRestClient = jest.fn().mockImplementation(() => {
				return {
					getNodes: jest.fn().mockResolvedValue(statisticServiceNodeResponse)
				};
			});

			// Act:
			const result = await NodeService.getAvailableNodes();

			// Assert:
			expect(result).toEqual([
				{
					...nodeCommonField,
					...nodeFormattedCommonField,
					apiEndpoint: 'N/A',
					roles: 'Peer node',
					rolesRaw: 1,
					peerStatus: generateNodePeerStatus(true)
				},
				{
					...nodeCommonField,
					...nodeFormattedCommonField,
					apiEndpoint: 'localhost.com',
					roles: 'Peer Api node',
					rolesRaw: 3,
					peerStatus: generateNodePeerStatus(true),
					apiStatus: generateNodeApiStatus(false)
				},
				{
					...nodeCommonField,
					...nodeFormattedCommonField,
					apiEndpoint: 'localhost.com',
					roles: 'Peer Api node',
					rolesRaw: 3,
					peerStatus: generateNodePeerStatus(true),
					apiStatus: generateNodeApiStatus(true)
				},
				{
					...nodeCommonField,
					...nodeFormattedCommonField,
					apiEndpoint: 'N/A',
					roles: 'Peer Voting node',
					rolesRaw: 5,
					peerStatus: generateNodePeerStatus(true)
				},
				{
					...nodeCommonField,
					...nodeFormattedCommonField,
					apiEndpoint: 'localhost.com',
					roles: 'Peer Api Voting node',
					rolesRaw: 7,
					peerStatus: generateNodePeerStatus(true),
					apiStatus: generateNodeApiStatus(true)
				}
			]);
		});

		runStatisticServiceFailResponseTests('getNodes', 'getAvailableNodes');
	});

	describe('getNodeStats', () => {
		it('return nodes count with 7 types of roles', async () => {
			// Arrange:
			http.statisticServiceRestClient = jest.fn().mockImplementation(() => {
				return {
					getNodes: jest.fn().mockResolvedValue(statisticServiceNodeResponse)
				};
			});

			// Act:
			const nodeStats = await NodeService.getNodeStats();

			// Assert:
			expect(nodeStats).toEqual({
				1: 1,
				2: 0,
				3: 2,
				4: 0,
				5: 1,
				6: 0,
				7: 1
			});
		});
	});

	describe('getNodeInfo', () => {
		// Arrange:
		Date.now = jest.fn(() => new Date('2023-02-21'));

		const expectedPeerStatus = {
			connectionStatus: true,
			lastStatusCheck: '2023-02-19 12:30:16'
		};

		const expectedAPIStatus = {
			apiNodeStatus: true,
			connectionStatus: false,
			databaseStatus: true,
			isHttpsEnabled: true,
			lastStatusCheck: '2023-02-21 00:00:00',
			restVersion: '2.4.2'
		};

		const expectedChainInfoStatus = {
			height: 2027193,
			finalizedHeight: 2031992,
			finalizationEpoch: 1413,
			finalizationPoint: 7,
			finalizedHash: '6B687D9B689611C90A1094A7430E78914F22A2570C80D3E42D520EB08091A973',
			lastStatusCheck: '2023-02-21 00:00:00'
		};

		const assertNodeStatus = async (node, expectedResult) => {
			// Arrange:
			http.statisticServiceRestClient = jest.fn().mockImplementation(() => {
				return {
					getNode: jest.fn().mockResolvedValue(node)
				};
			});

			// Act:
			const { apiStatus, chainInfo, peerStatus } =
				await NodeService.getNodeInfo(node.publicKey);

			// Assert:
			expect(apiStatus).toEqual(expectedResult.apiStatus);
			expect(chainInfo).toEqual(expectedResult.chainInfo);
			expect(peerStatus).toEqual(expectedResult.peerStatus);
		};

		it('returns peer node status when peer status is present', async () => {
			await assertNodeStatus(statisticServiceNodeResponse[0], {
				peerStatus: expectedPeerStatus,
				apiStatus: {},
				chainInfo: {}
			});
		});

		it('returns api node status and chain info when api status is present', async () => {
			await assertNodeStatus(statisticServiceNodeResponse[1], {
				peerStatus: {},
				apiStatus: expectedAPIStatus,
				chainInfo: expectedChainInfoStatus
			});
		});

		it('returns chain info, api and peer node status when both status is present', async () => {
			await assertNodeStatus(statisticServiceNodeResponse[2], {
				peerStatus: expectedPeerStatus,
				apiStatus: expectedAPIStatus,
				chainInfo: expectedChainInfoStatus
			});
		});

		const runLightRestNodeTests = roles => {
			it(`returns roles ${roles} node status and light rest status`, async () => {
				// Arrange:
				const lightNodeResponse = {
					roles,
					peerStatus: generateNodePeerStatus(true),
					apiStatus: {
						...generateNodeApiStatus(true),
						nodeStatus: undefined
					},
					...nodeCommonField
				};

				const expectedLightAPIStatus = {
					...expectedAPIStatus,
					lightNodeStatus: true,
					connectionStatus: true
				};
				delete expectedLightAPIStatus.databaseStatus;
				delete expectedLightAPIStatus.apiNodeStatus;

				await assertNodeStatus(lightNodeResponse, {
					peerStatus: expectedPeerStatus,
					apiStatus: expectedLightAPIStatus,
					chainInfo: expectedChainInfoStatus
				});
			});
		};

		[1, 4, 5].forEach(roles => runLightRestNodeTests(roles));

		runStatisticServiceFailResponseTests('getNode', 'getNodeInfo');
	});

	describe('getAvailableNodeList', () => {
		const assertNodeRolesName = async (node, expectedResult) => {
			// Arrange:
			jest.spyOn(NodeService, 'getAvailableNodes')
				.mockReturnValue(Promise.resolve([node]));

			// Act:
			const result = await NodeService.getAvailableNodeList({
				rolesRaw: null
			});

			// Assert:
			expect(result.data[0].roles).toEqual(expectedResult);
		};

		it('returns roles name with API node' , async () => {
			[2,3,6,7].forEach(role => assertNodeRolesName({
				...nodeCommonField,
				...nodeFormattedCommonField,
				apiEndpoint: 'N/A',
				roles: 'API node',
				rolesRaw: role,
				peerStatus: generateNodePeerStatus(true),
				apiStatus: generateNodeApiStatus(true)
			}, 'API node'));
		});

		it('returns roles name with (light) keywords for Peer node', async () => {
			[1,4,5].forEach(role => assertNodeRolesName({
				...nodeCommonField,
				...nodeFormattedCommonField,
				apiEndpoint: 'N/A',
				roles: 'Peer node',
				rolesRaw: role,
				peerStatus: generateNodePeerStatus(true),
				apiStatus: generateNodeApiStatus(true)
			}, 'Peer node (light)'));
		});
	});
});
