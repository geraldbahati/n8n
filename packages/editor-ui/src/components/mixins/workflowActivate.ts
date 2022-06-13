import { externalHooks } from '@/components/mixins/externalHooks';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';


import mixins from 'vue-typed-mixins';
import { LOCAL_STORAGE_ACTIVATION_FLAG, WORKFLOW_ACTIVE_MODAL_KEY } from '@/constants';

export const workflowActivate = mixins(
	externalHooks,
	workflowHelpers,
	showMessage,
)
	.extend({
		data() {
			return {
				updatingWorkflowActivation: false,
			};
		},
		methods: {
			async activateCurrentWorkflow() {
				const workflowId = this.$store.getters.workflowId;
				return this.updateWorkflowActivation(workflowId, true);
			},
			async updateWorkflowActivation(workflowId: string | undefined, newActiveState: boolean) {
				this.updatingWorkflowActivation = true;
				const nodesIssuesExist = this.$store.getters.nodesIssuesExist as boolean;

				let currWorkflowId: string | undefined = workflowId;
				if (!currWorkflowId) {
					const saved = await this.saveCurrentWorkflow();
					if (!saved) {
						this.updatingWorkflowActivation = false;
						return;
					}
					currWorkflowId = this.$store.getters.workflowId as string;
				}

				const isCurrentWorkflow = currWorkflowId === this.$store.getters['workflowId'];

				try {
					if (isCurrentWorkflow && nodesIssuesExist) {
						this.$showMessage({
							title: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title'),
							message: this.$locale.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.message'),
							type: 'error',
						});

						this.updatingWorkflowActivation = false;
						return;
					}

					if (newActiveState) {
						this.$telemetry.track('User set workflow active status');
					}

					await this.updateWorkflow({workflowId: currWorkflowId, active: newActiveState});
				} catch (error) {
					const newStateName = newActiveState === true ? 'activated' : 'deactivated';
					this.$showError(
						error,
						this.$locale.baseText(
							'workflowActivator.showError.title',
							{ interpolate: { newStateName } },
						) + ':',
					);
					this.updatingWorkflowActivation = false;
					return;
				}

				const activationEventName = isCurrentWorkflow ? 'workflow.activeChangeCurrent' : 'workflow.activeChange';
				this.$externalHooks().run(activationEventName, { workflowId: currWorkflowId, active: newActiveState });
				this.$telemetry.track('User set workflow active status', { workflow_id: currWorkflowId, is_active: newActiveState });

				this.$emit('workflowActiveChanged', { id: currWorkflowId, active: newActiveState });
				this.updatingWorkflowActivation = false;

				if (isCurrentWorkflow) {
					if (newActiveState && window.localStorage.getItem(LOCAL_STORAGE_ACTIVATION_FLAG) !== 'true') {
						this.$store.dispatch('ui/openModal', WORKFLOW_ACTIVE_MODAL_KEY);
					}
					else {
						this.$store.dispatch('settings/fetchPromptsData');
					}
				}
			},
		},
	});
