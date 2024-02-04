import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import { License } from '@/License';

import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils/';
import { createMember, createUser } from '../shared/db/users';
import { randomCredentialPayload as payload } from '../shared/random';
import { saveCredential } from '../shared/db/credentials';

// mock that credentialsSharing is not enabled
jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(false);
const testServer = utils.setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

type GetAllResponse = { body: { data: ListQuery.Credentials.WithOwnedByAndSharedWith[] } };
describe('GET /credentials', () => {
	describe('should return', () => {
		test('all credentials for owner', async () => {
			const { id: id1 } = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			const { id: id2 } = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredential2);

			const savedIds = [id1, id2].sort();
			const returnedIds = response.body.data.map((c) => c.id).sort();

			expect(savedIds).toEqual(returnedIds);
		});

		test('only own credentials for member', async () => {
			const firstMember = member;
			const secondMember = await createMember();

			const c1 = await saveCredential(payload(), { user: firstMember, role: 'credential:owner' });
			const c2 = await saveCredential(payload(), { user: secondMember, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(firstMember)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [firstMemberCred] = response.body.data;

			validateCredential2(firstMemberCred);
			expect(firstMemberCred.id).toBe(c1.id);
			expect(firstMemberCred.id).not.toBe(c2.id);
		});
	});

	describe('filter', () => {
		test('should filter credentials by field: name - full match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${savedCred.name}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.name).toBe(savedCred.name);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: name - partial match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const partialName = savedCred.name.slice(3);

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${partialName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.name).toBe(savedCred.name);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: type - full match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${savedCred.type}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.type).toBe(savedCred.type);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: type - partial match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const partialType = savedCred.type.slice(3);

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${partialType}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.type).toBe(savedCred.type);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});
	});

	describe('select', () => {
		test('should select credential field: id', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["id"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ id: expect.any(String) }, { id: expect.any(String) }],
			});
		});

		test('should select credential field: name', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["name"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ name: expect.any(String) }, { name: expect.any(String) }],
			});
		});

		test('should select credential field: type', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["type"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ type: expect.any(String) }, { type: expect.any(String) }],
			});
		});
	});

	describe('take', () => {
		test('should return n credentials or less, without skip', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=2')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredential2);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1')
				.expect(200);

			expect(_response.body.data).toHaveLength(1);

			_response.body.data.forEach(validateCredential2);
		});

		test('should return n credentials or less, with skip', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1&skip=1')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			response.body.data.forEach(validateCredential2);
		});
	});
});

// TODO: merge with other validateCredential
function validateCredential2(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	const { name, type, nodesAccess, sharedWith, ownedBy } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect(typeof nodesAccess[0].nodeType).toBe('string');
	expect('data' in credential).toBe(false);

	if (sharedWith) expect(Array.isArray(sharedWith)).toBe(true);

	if (ownedBy) {
		const { id, email, firstName, lastName } = ownedBy;

		expect(typeof id).toBe('string');
		expect(typeof email).toBe('string');
		expect(typeof firstName).toBe('string');
		expect(typeof lastName).toBe('string');
	}
}
