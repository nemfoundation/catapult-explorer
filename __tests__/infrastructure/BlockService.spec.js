import { BlockService, AccountService, NodeService } from '../../src/infrastructure';
import Helper from '../../src/helper';
import TestHelper from '../TestHelper';
import { restore, stub } from 'sinon';

describe('Block Service', () => {
	describe('getBlockInfo should', () => {
		let getAccount = {};
		let getBlockByHeight = {};

		beforeEach(() => {
			getAccount = stub(AccountService, 'getAccount');
			getBlockByHeight = stub(BlockService, 'getBlockByHeight');
		});

		afterEach(restore);

		it('return normal block object', async () => {
			// Arrange:
			const blockHeight = 10;
			const account = TestHelper.generateAccount(1)[0];
			const mockAccountInfo = TestHelper.mockAccountInfo(account);
			const mockBlockInfo = TestHelper.mockBlockInfo(blockHeight, account.address.plain());

			getAccount.returns(Promise.resolve(mockAccountInfo));

			getBlockByHeight.returns(Promise.resolve(mockBlockInfo));

			// Act:
			const blockInfo = await BlockService.getBlockInfo(blockHeight);

			// Assert:
			expect(blockInfo.height).toEqual(blockHeight);
			expect(blockInfo.symbolTime).toEqual(mockBlockInfo.timestamp);
			expect(blockInfo.payloadSize).toEqual(mockBlockInfo.size);
			expect(blockInfo.blockHash).toEqual(mockBlockInfo.hash);
			expect(blockInfo.harvester.signer).toEqual(account.address.plain());
			expect(blockInfo.harvester.linkedAddress).toHaveLength(39);
			expect(blockInfo.merkleInfo.stateHashSubCacheMerkleRoots).toHaveLength(9);
			expect(blockInfo.merkleInfo.stateHash).toEqual(mockBlockInfo.stateHash);
			expect(blockInfo.merkleInfo.blockReceiptsHash).toEqual(mockBlockInfo.blockReceiptsHash);
			expect(blockInfo.merkleInfo.blockTransactionsHash).toEqual(mockBlockInfo.blockTransactionsHash);
		});

		it('return important block object', async () => {
			// Arrange:
			const blockHeight = 10;
			const account = TestHelper.generateAccount(1)[0];
			const mockAccountInfo = TestHelper.mockAccountInfo(account);
			const mockImportantBlockInfo = TestHelper.mockBlockInfo(blockHeight, account.address.plain(), true);

			getAccount.returns(Promise.resolve(mockAccountInfo));

			getBlockByHeight.returns(Promise.resolve(mockImportantBlockInfo));

			// Act:
			const blockInfo = await BlockService.getBlockInfo(blockHeight);

			// Assert:
			expect(blockInfo.totalVotingBalance).toEqual('1.000000');
			expect(blockInfo.harvestingEligibleAccountsCount).toEqual(mockImportantBlockInfo.harvestingEligibleAccountsCount);
			expect(blockInfo.blockType).toEqual('Importance Block');
			expect(blockInfo.type).toEqual(33347);
		});
	});

	describe('getBlockList should', () => {
		const pageInfo = {
			pageNumber: 1,
			pageSize: 10
		};

		let getAccounts = {};
		let searchBlocks = {};
		let getStorageInfo = {};

		beforeAll(async () => {
			getAccounts = stub(AccountService, 'getAccounts');
			searchBlocks = stub(BlockService, 'searchBlocks');
			getStorageInfo = stub(NodeService, 'getStorageInfo');

			getStorageInfo.returns(Promise.resolve({
				numBlocks: 100
			}));
		});

		afterEach(restore);

		it('return blocks', async () => {
			// Arrange:
			const epochAdjustment = 1637848847;
			const accounts = TestHelper.generateAccount(10);

			const mockAccounts = accounts.map(account => {
				return TestHelper.mockAccountInfo(account);
			});

			const mockSearchBlocks = {
				...pageInfo,
				data: accounts.map((account, index) => {
					return TestHelper.mockBlockInfo(index + 1, account.address.plain());
				})
			};

			getAccounts.returns(Promise.resolve(mockAccounts));

			searchBlocks.returns(Promise.resolve(mockSearchBlocks));

			// Act:
			const blockList = await BlockService.getBlockList(pageInfo);

			// Assert:
			expect(blockList.totalRecords).toEqual(100);
			expect(blockList.data[0].harvester.signer).toEqual(accounts[0].address.plain());
			blockList.data.forEach((block, index) => {
				expect(block.age).toEqual(Helper.convertToUTCDate(epochAdjustment + index + 1));
				expect(block).toHaveProperty('harvester');
				expect(block.harvester).toHaveProperty('signer');
				expect(block.harvester).toHaveProperty('linkedAddress');
			});
		});
	});
});