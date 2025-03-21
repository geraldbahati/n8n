import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { setup, workflowToTests, getWorkflowFilenames } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

describe('Test N8n Node, expect base_url to be received from credentials', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		//base url is set in fake credentials map packages/nodes-base/test/nodes/FakeCredentialsMap.ts
		const baseUrl = 'https://test.app.n8n.cloud/api/v1';
		nock(baseUrl).get('/workflows?tags=n8n-test').reply(200, {});
	});
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
