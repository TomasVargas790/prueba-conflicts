import { LightningElement, track } from 'lwc';
import { constText } from 'c/utils';
import { NavigationMixin } from 'lightning/navigation';
//CUSTOM LABEL
import goToOne from '@salesforce/label/c.AgentIngressZurichOne';
import goToPortal from '@salesforce/label/c.AgentIngressZurichPortal';
//APEX
import validatePortalAccess from '@salesforce/apex/AgentUserAccessController.validateUserPortalAccess';
import goONE from '@salesforce/apex/AgentUserAccessController.generateURLONE';
import goPortal from '@salesforce/apex/AgentUserAccessController.goToPortal';

export default class AgentDirectNavigate extends NavigationMixin(
    LightningElement
) {
    /**
     * @private
     * @var {boolean} loading - Indicates when c:agentLoading needs to be rendered
     */
    @track loading = true;

    /**
     * @private
     * @var {boolean} [areButtonsShown = false] - Indicates when c:agentButton needs to be rendered
     */
    @track areButtonsShown = false;

    /**
     * @private
     * @property {Object} label - General variable for all labels
     * @property {string} label.goToOne - Go to Zurich ONE button label
     * @property {string} label.goToPortal - Go to Zurich Portal button label
     */
    label = {
        goToOne,
        goToPortal,
    };

    /**
     * @function connectedCallback
     * Connected Callback of the component. Calls this.validateUserPortalAccess
     * @returns {} - Without return value
     */
    connectedCallback() {
        this.validateUserPortalAccess();
        console.log('CONECCTCALB',this.validateUserPortalAccess());
    }

    /**
     * @function validateUserPortalAccess
     * Calls apex method validatePortalAccess. Redirect to url from backend
     * @param {string} value - input value
     * @returns {} - Without return value
     */
    validateUserPortalAccess() {
        this.loading = true;
        validatePortalAccess({})
            .then((result) => {
                if ( result.state === constText.stateSuccess || result.state === constText.stateWarning) {
                    if (result.data.redirect) {
                        window.location.href = result.data.access;
                    } else {
                        this.areButtonsShown = true;
                        this.loading = false;
                    }
                }
            })
            .catch((error) => {
                console.log(error);
                this.loading = false;
            });
    }

    /**
     * @function handlerClickGoOne
     * Function that handles an event from c:agentButton
     * @param {object} event - The event of the custom event.
     * @listens onclick
     * @returns {} - Without return value
     */
    handlerClickGoOne(event) {
        event.preventDefault();
        this.loading = true;
        goONE({})
            .then((result) => {
                if (result.state === constText.stateSuccess) {
                    if (result.data && result.data.redirect) {
                        window.location.href = result.data.access;
                    }
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }

    /**
     * @function handlerClickGoPortal
     * Function that handles an event from c:agentButton
     * @param {object} event - The event of the custom event.
     * @listens onclick
     * @returns {} - Without return value
     */
    handlerClickGoPortal(event) {
        event.preventDefault();
        this.loading = true;
        goPortal({})
            .then((result) => {
                if (result.state === constText.stateSuccess) {
                    window.location.reload();
                }
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                this.loading = false;
            });
    }
}