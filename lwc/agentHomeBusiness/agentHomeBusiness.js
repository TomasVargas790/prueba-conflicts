import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';
import { setSessionStorage } from 'c/utils';
import menuOptions from '@salesforce/apex/AgentHomePageController.getMenuOptions';
import addEmbedded from '@salesforce/apex/AgentBusinessManagementController.addEmbedded';
import {
    getObjectListByKey,
    getUserApplication,
    errorRefPage,
} from './helper';
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

    label = {
        title: 'Cotiza tus negocios',
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
                if (result.data) {
                    this.options = result.data.menu;
                    this.setCookies(result.data.cookies);
                    this.apps = result.data.apps;
                    this.appsList = getObjectListByKey(this.apps);
                    this.userOne = result.data.oneUsers[0];
                } else {
                }
            })
            .catch((error) => {
                console.log(error);
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
        let labelTest = event.target.value;
        if(this.options.find((o) => o.label === event.target.value).option === 'OFICINAVIRTUAL'){
            let record = this.options.find((o) => o.label === event.target.value);
            let result = await addEmbedded({
                requestWrapper : {option: record.option,
                    url: record.url,
                    account: null,
                    role: null,
                    oneUser: this.userOne,
                    company: record.company,
                    userApplication: getUserApplication(
                        this.appsList,
                        record
                    ),
                }
            });
            console.log(result);
            resultUrl = result.data.url;
        } else if(labelTest == 'Autos Lineas Personales'){
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                    name: 'OmniFromHome__c',
                },
            });
        } else {
            resultUrl = this.options.find(
                (o) => o.label === event.target.value
            ).url;
        }
        if(labelTest != 'Autos Lineas Personales'){
            this.iframeUrl = resultUrl;
            this.openModal = true;
        }
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

    async addEmbedded(requestWrapper) {
        try {
            let result = await addEmbedded({
                requestWrapper: requestWrapper,
            });
            if (result.state === constText.stateSuccess) {
                this.optionUrl = result.data.url;
                this.agentsList = result.data.agents ? result.data.agents : [];
                this.optionError = undefined;
            } else {
                this.optionError = result.message;
                this.optionUrl = undefined;
                this.optionsList = this.agentsList = [];
            }
        } catch (error) {
            console.log(error);
            this[NavigationMixin.Navigate](errorRefPage);
        }
    }
}