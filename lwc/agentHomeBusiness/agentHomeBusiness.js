import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';
import { setSessionStorage } from 'c/utils';
import { constText } from 'c/utils';
import menuOptions from '@salesforce/apex/AgentHomePageController.getMenuOptions';
import addEmbedded from '@salesforce/apex/AgentBusinessManagementController.addEmbedded';
import AgentGeneralError from '@salesforce/label/c.AgentGeneralError';
import { getObjectListByKey, getUserApplication, errorRefPage } from './helper';
export default class AgentHomeBusiness extends NavigationMixin(
    LightningElement
) {
    @track options;

    @track openModal = false;

    @track firstCharge = false;

    @track iframeUrl;

    @track userOne;

    @track apps;

    @track appsList;

    /**
     * @var errorMessage
     * Set error message depending on back response from menuOptions
     * @returns {String} - String error message
     */
    errorMessage;

    /**
     * @var hasError
     * Set error message depending on back response from menuOptions
     * @returns {Boolean} -
     */
    hasError;

    /**
     * @var errorModalMessage
     * Set error message depending on back response from addEmbedded
     * @returns {String} - String error message
     */
    errorModalMessage;

    label = {
        title: 'Cotiza tus negocios',
        noUserPermissionError:
            'Esta funcionalidad no está disponible al ingresar como otro usuario',
        AgentGeneralError,
    };

    /**
     * @var pageRef
     * Get Paga reference used on pubsub services.
     * @param {method} CurrentPageReference - Salesforce CurrentPageReference - Required
     * @returns {} - Without return value
     */
    @wire(CurrentPageReference) pageRef;

    connectedCallback() {
        this.getMenuOptions();
    }

    /**
     * @function renderedCallback
     * Rendered of the component
     * @returns {} - Without return value
     */
    renderedCallback() {
        if (this.firstCharge === false) {
            this.firstCharge = true;
            let el = this.template.querySelector('.business');
            this.componentWidth = el.getBoundingClientRect().width;
            this.componentWidth < 789
                ? (el.className = 'business-small')
                : 'business';
        }
    }

    /**
     * @function getMenuOptions
     * Calls apex method getMenuOptions.
     * @returns {} - Without return value
     */
    getMenuOptions() {
        menuOptions({})
            .then((result) => {
                if (result.state === constText.stateSuccess) {
                    this.options = result.data.menu;
                    this.setCookies(result.data.cookies);
                    this.apps = result.data.apps;
                    this.appsList = getObjectListByKey(this.apps);
                    this.userOne = result.data.oneUsers[0];
                    this.errorMessage = null;
                    this.hasError = result.data.isLoginAs;
                } else {
                    this.options = null;
                    this.errorMessage = this.label.AgentGeneralError;
                    this.hasError = null;
                }
            })
            .catch((error) => {
                console.log(error);
                this.options = null;
                this.errorMessage = this.label.AgentGeneralError;
                this.hasError = null;
            });
    }

    /**
     * @function setCookiesAndSessionStorage
     * Function to set up this.stepper
     * @param {string[]} cookies[] - Cookies to set.
     * @param {string} cookies[i] - Cookies name.
     * @returns {} - Without return value
     */
    setCookies(cookies) {
        cookies.forEach((cookie) => {
            fireEvent(this.pageRef, 'cookieRequest', {
                method: 'set',
                value: cookie,
            });
        });
    }

    async handlerClickOpenModal(event) {
        let resultUrl;
        if (
            this.options.find((o) => o.label === event.target.value).option ===
            'OFICINAVIRTUAL'
        ) {
            let record = this.options.find(
                (o) => o.label === event.target.value
            );
            try {
                let result = await addEmbedded({
                    requestWrapper: {
                        option: record.option,
                        url: record.url,
                        account: null,
                        role: null,
                        oneUser: this.userOne,
                        company: record.company,
                        userApplication: getUserApplication(
                            this.appsList,
                            record
                        ),
                    },
                });
                if (result.state === constText.stateSuccess) {
                    resultUrl = result.data?.url;
                    this.errorModalMessage = null;
                } else {
                    resultUrl = null;
                    this.errorModalMessage = result.message;
                }
            } catch (error) {
                console.log(error);
                this.errorModalMessage = null;
            }
        } else {
            /* this is a temporary fix when the clicked option does not have option: OFICINAVIRTUAL - Pending Definition */
            resultUrl = this.options.find(
                (o) => o.label === event.target.value
            ).url;
            this.errorModalMessage = this.hasError
                ? this.label.noUserPermissionError
                : null;
        }
        this.iframeUrl = resultUrl && !this.hasError ? resultUrl : null;
        this.openModal = true;
    }

    handlerCloseModal() {
        this.openModal = false;
    }

    handlerClickNavigation() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'negocios__c',
            },
        });
    }
}