import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';
import { constText, setSessionStorage, getSessionStorage } from 'c/utils';
import {
    getObjectListByKey,
    findDeepObject,
    getObjectList,
    getUserApplication,
    errorRefPage,
} from './helper';
//APEX
import getOneUsers from '@salesforce/apex/AgentBusinessManagementController.getOneUsers';
import getMenuAndCookies from '@salesforce/apex/AgentBusinessManagementController.getMenuAndCookies';
import addEmbedded from '@salesforce/apex/AgentBusinessManagementController.addEmbedded';
import validateCompanyAccess from '@salesforce/apex/AgentBusinessManagementController.validateCompanyAccess';
// CUSTOM LABELS
import title from '@salesforce/label/c.AgentBusinessTitle';
// STATIC RESOURCE
import agentContent from '@salesforce/resourceUrl/ContenidosAgentes';

export default class AgentBusinessManagement extends NavigationMixin(
    LightningElement
) {
    /**
     * @private
     * @var {object[]} userList[] - User ONE list - Set up from Func:getOneUserList
     * @var {string}   userList[].label - User label
     * @var {string}   userList[].value - User value
     */
    @track userList;

    /**
     * @private
     * @var {string} userOne [userOne = getSessionStorage('userOne')] - User ONE selected
     */
    @track userOne = getSessionStorage('userOne');

    /**
     * @private
     * @var {boolean} loading - Indicates when c:agentLoading needs to be rendered
     */
    @track loading;

    /**
     * @private
     * @var {object[]} optionsList[] [optionsList = []] - Menu options list - Set up from Func:getMenuAndCookiesList
     */
    @track optionsList = [];

    /**
     * @private
     * @var {object[]} breadcrumbList[] [breadcrumbList = []] - Breadcrumb list
     * @var {string}   breadcrumbList[].id - Breadcrumb id
     * @var {string}   breadcrumbList[].label - Breadcrumb label
     */
    @track breadcrumbList = [];

    /**
     * @private
     * @var {object[]} agentsList[] [agentsList = []] - Agent list - Set up from Func:addEmbedded
     * @var {string}   agentsList[].label - Agent label
     * @var {string}   agentsList[].value- Agent value
     */
    @track agentsList = [];

    /**
     * @private
     * @var {object[]} appsList[] [appsList = []] - Apps list - Set up from Func:getMenuAndCookiesList
     */
    @track appsList = [];

    /**
     * @private
     * @var {string} optionUrl - URL from menu options - Set up from Func:addEmbedded
     */
    @track optionUrl;

    /**
     * @private
     * @var {string} iframeUrl - URL to embedded into iframe - Set up from Func:addEmbedded
     */
    @track iframeUrl;

    /**
     * @private
     * @var {string} optionError - Error message from menu options - Set up from Func:addEmbedded
     */
    @track optionError;

    /**
     * @private
     * @var {boolean} showIframe [showIframe = false] - Indicates when c:agentIframe needs to be rendered
     */
    @track showIframe = false;

    /**
     * @private
     * @var {boolean} showModal [showModal = false] - Indicates when c:agentModal needs to be rendered
     */
    @track showModal = false;

    /**
     * @private
     * @var {string} messageError - Error message from getOneUserList
     */
    @track messageError;

    /**
     * @private
     * @property {object} options - Menu options - Set up from Func:getMenuAndCookiesList
     */
    options;

    /**
     * @private
     * @property {object} apps - Apps - Set up from Func:getMenuAndCookiesList
     */
    apps;

    /**
     * @private
     * @property {string} optionIconPath [agentContent + '/Negocios'] - Static Resource path + icon path
     */
    optionIconPath = agentContent + '/Negocios';

    /**
     * @private
     * @property {string} currentPage - Stores Api name of the page without __c
     */
    currentPage;

    /**
     * @private
     * @property {string} isValidCompany - Stores validity of view as company
     */
     isValidCompany;

    /**
     * @private
     * @property {Object} label - General variable for all labels
     * @property {string} label.title - Title label
     */

    label = {
        title,
    };

    /**
     * @var pageRef
     * Get Paga reference used on pubsub services.
     * @param {method} CurrentPageReference - Salesforce CurrentPageReference - Required
     * @returns {} - Without return value
     */
    @wire(CurrentPageReference) pageRef;

    /**
     * @function connectedCallback
     * Connected Callback of the component
     * @returns {} - Without return value
     */
    async connectedCallback() {
        this.currentPage = this.pageRef.attributes.name.split('__c')[0];
        await this.getOneUserList();
        if (this.userList.length === 0) {
            errorRefPage.state = {
                messageParameter: this.messageError
            };
            this[NavigationMixin.Navigate](errorRefPage);
        } else if (this.userList.length === 1) {
            this.userOne = this.userList[0].value;
            setSessionStorage('userOne', this.userOne);
        }
        if (this.userOne) {
            this.getMenuAndCookiesList(this.userOne);
        }
    }

    get root() {
        switch (this.currentPage) {
            case 'servicios':
                return 'Solicitudes de Servicio';
                break;
            case 'negocios':
                return 'Gestion de Negocios';
                break;
            case 'informes':
                return 'Informes';
                break;
        }
    }

    // --- User ONE - c:agentBusinessManagementUser -- //
    /**
     * @function getOneUserList
     * Calls apex method getOneUsers. Set up this.userList
     * @returns {} - Without return value
     */
    async getOneUserList() {
        this.loading = true;
        try {
            let list = await getOneUsers();
            this.userList =
                list.state === constText.stateSuccess
                    ? list.data.oneUsers.map((user) => ({
                          label: user,
                          value: user,
                      }))
                    : [];
            this.messageError = list.state === constText.stateWarning && list.message;
            this.loading = false;
        } catch (error) {
            console.log(error);
            this.userList = [];
            this.loading = false;
        }
    }

    /**
     * @function handlerSelectedUser
     * Function that handle an event from c:agentBusinessManagementUser
     * Get selected user ONE
     * @param {object} event - The event of the custom event.
     * @listens onselecteduser
     * @returns {} - Without return value
     */
    handlerSelectedUser(event) {
        event.stopPropagation();
        this.userOne = event.detail;
        this.showIframe = false;
        setSessionStorage('userOne', this.userOne);
        this.getMenuAndCookiesList(this.userOne);
    }

    /**
     * @function handlerSwitchUser
     * Function that handle an event from c:agentBusinessManagementUser
     * Swith user ONE and calls apex method
     * @param {object} event - The event of the custom event.
     * @listens onswitch
     * @returns {} - Without return value
     */
    handlerSwitchUser(event) {
        event.stopPropagation();
        this.getOneUserList();
    }

    /**
     * @function handlerCloseUserModal
     * Function that handle an event from c:agentBusinessManagementUser
     * Close modal
     * @param {object} event - The event of the custom event.
     * @listens onclose
     * @returns {} - Without return value
     */
    handlerCloseUserModal(event) {
        event.stopPropagation();
        if (
            !this.userOne ||
            !this.userList.some((user) => user.value === this.userOne)
        ) {
            this[NavigationMixin.Navigate](errorRefPage);
        }
    }
    // --- END User ONE - c:agentBusinessManagementUser -- //

    // --- Breadcrumb - c:agentBusinessManagementBreadcrumb --- //
    /**
     * @function handlerBreadcrumbNavigation
     * Function that handle an event from c:agentBusinessManagementBreadcrumb
     * Breadcrumb navigation
     * @param {object} event - The event of the custom event.
     * @listens onbreadcrumbnavigation
     * @returns {} - Without return value
     */
    handlerBreadcrumbNavigation(event) {
        event.stopPropagation();
        const navigationId = event.detail.id;
        this.showIframe = false;
        this.optionError = undefined;
        if (navigationId === 'root') {
            this.optionsList = getObjectListByKey(this.options);
            this.breadcrumbList = [];
            this.label.title = title;
        } else {
            const listIndex = this.breadcrumbList.findIndex(
                (path) => path.id === navigationId
            );
            this.breadcrumbList = this.breadcrumbList.slice(0, listIndex + 1);
            this.optionsList = getObjectList(this.breadcrumbList, this.options);
            this.label.title = event.detail.label;
        }
    }
    // --- END Breadcrumb - c:agentBusinessManagementBreadcrumb --- //

    // --- Options/Menu - c:agentButtonLarge --- //
    /**
     * @function menuColumnClass
     * Menu columns class
     * @returns {string} - Menu columns class
     */
    get menuColumnClass() {
        const optClass = 'business-menu__option';
        let column;
        if (this.optionsList.length > 0) {
            column =
                this.optionsList.length > 5
                    ? `${optClass} ${optClass}--two-column`
                    : optClass;
        }
        return column;
    }

    /**
     * @function getOneUserList
     * Calls apex method getMenuAndCookies. Set up this.apps, this.options, this.appsList
     * @param {string} userOne - Selected user ONE
     * @returns {} - Without return value
     */
    getMenuAndCookiesList(userOne) {
        this.loading = true;
        getMenuAndCookies({
            requestWrapper: {
                oneUser: userOne,
                pageName: this.currentPage,
            },
        })
            .then((result) => {
                if (result.state === constText.stateSuccess) {
                    const cookies = result.data.cookies;
                    const breadcrumb = getSessionStorage('breadcrumbList');
                    const urlParams = new URL(window.location).searchParams;
                    this.apps = result.data.apps;
                    this.options = result.data.menu;
                    this.appsList = getObjectListByKey(this.apps);
                    this.setCookiesAndSessionStorage(cookies);
                    if (urlParams.get('redirect') && breadcrumb) {
                        this.optionsList = this.getBreadcrumbList(
                            breadcrumb,
                            this.options
                        );
                        this.label.title = this.breadcrumbList[
                            this.breadcrumbList.length - 1
                        ].label;
                    } else {
                        this.label.title = title;
                        this.optionsList = getObjectListByKey(this.options);
                        this.breadcrumbList = [];
                    }
                    this.optionError = undefined;
                    this.loading = false;
                } else {
                    this.optionError = result.message;
                    this.loading = false;
                }
            })
            .catch((error) => {
                console.log(error);
                this.loading = false;
                this[NavigationMixin.Navigate](errorRefPage);
            });
    }

    /**
     * @function addEmbedded
     * Calls apex method addEmbedded. Set up this.optionUrl, this.agentsList, this.optionError
     * @param {object} requestWrapper - Request wrapper
     * @param {string} requestWrapper.option - Menu option label
     * @param {string} requestWrapper.url - Menu option URL
     * @param {string} requestWrapper.account - Selected agent account
     * @param {string} requestWrapper.role - Selected agent role
     * @param {string} requestWrapper.oneUser - Selected user ONE
     * @param {string} requestWrapper.userApplication - User App
     * @param {string} requestWrapper.community - Community URL
     * @param {string} requestWrapper.company - Company
     * @returns {} - Without return value
     */
    async addEmbedded(requestWrapper) {
        this.loading = true;
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
            this.loading = false;
        } catch (error) {
            console.log(error);
            this.loading = false;
            this[NavigationMixin.Navigate](errorRefPage);
        }
    }

    /**
     * @function validateCompanyAccess
     * Calls apex method validateCompanyAccess. Set up this.optionUrl, this.agentsList, this.optionError
     * @param {string} requestWrapper.company - Company
     * @returns {} - Without return value
     */
    async validateCompanyAccess(requestWrapper) {
        this.loading = true;
        try {
            let result = await validateCompanyAccess({
                requestWrapper: requestWrapper,
            });
            if (result.state === constText.stateSuccess) {
                this.isValidCompany = true;
            } else {
                this.isValidCompany = false;
                this.optionError = result.message;
                this.optionUrl = undefined;
                this.optionsList = this.agentsList = [];
            }
            this.loading = false;
        } catch (error) {
            console.log(error);
            this.loading = false;
            this[NavigationMixin.Navigate](errorRefPage);
        }
    }

    /**
     * @function setCookiesAndSessionStorage
     * Function to set up this.stepper
     * @param {string[]} cookies[] - Cookies to set.
     * @param {string} cookies[i] - Cookies name.
     * @returns {} - Without return value
     */
    setCookiesAndSessionStorage(cookies) {
        cookies.forEach((cookie) => {
            fireEvent(this.pageRef, 'cookieRequest', {
                method: 'set',
                value: cookie,
            });
        });
        setSessionStorage(
            'cookieNames',
            cookies.map((cookie) => cookie.split('=')[0])
        );
        setSessionStorage('apps', JSON.stringify(this.apps));
    }

    /**
     * @function getBreadcrumbList
     * Function to set up this.stepper
     * @param {string[]} breadcrumb[] - Breadcrumb list
     * @param {string} breadcrumb[i] - Breadcrumb label
     * @param {object} options - Menu options
     * @returns {object[]} - Without return value
     */
    getBreadcrumbList(breadcrumb, options) {
        this.breadcrumbList = JSON.parse(breadcrumb);
        return getObjectList(this.breadcrumbList, options);
    }

    /**
     * @function handlerButtonLarge
     * Function that handle an event from c:agentButtonLarge
     * Menu option click
     * @param {object} event - The event of the custom event.
     * @listens onbuttonclick
     * @returns {} - Without return value
     */
    async handlerButtonLarge(event) {
        event.stopPropagation();
        const optionId = event.detail.id;
        const optionLabel = event.detail.label;
        this.breadcrumbList.push({ id: optionId, label: optionLabel });
        const options = findDeepObject(this.breadcrumbList, this.options);
        let enbeddedWrapper;
        if (options.url) {
            switch (options.option) {
                case 'TECNORED':
                    enbeddedWrapper = {
                        option: options.option,
                        url: options.url,
                        account: null,
                        company: options.icons[0],
                    };
                    await this.addEmbedded(enbeddedWrapper);
                    this.showIframe = this.iframeUrl = this.optionUrl;
                    this.showModal =
                        this.agentsList.length > 0 && !this.optionUrl;
                    break;
                case 'OFICINAVIRTUAL':
                    enbeddedWrapper = {
                        option: options.option,
                        url: options.url,
                        account: null,
                        role: null,
                        oneUser: this.userOne,
                        userApplication: getUserApplication(
                            this.appsList,
                            options
                        ),
                        company: options.icons[0],
                    };
                    await this.addEmbedded(enbeddedWrapper);
                    this.showIframe = this.iframeUrl = this.optionUrl;
                    this.showModal =
                        this.agentsList.length > 0 && !this.optionUrl;
                    break;
                case 'COTIZADORGLM':
                    enbeddedWrapper = {
                        option: options.option,
                        url: options.url,
                        community: window.location.href,
                        userApplication: getUserApplication(
                            this.appsList,
                            options
                        ),
                        company: options.icons[0],
                    };
                    await this.addEmbedded(enbeddedWrapper);
                    this.iframeUrl = this.optionUrl;
                    this.showIframe = true;
                    break;
                case 'NUEVAVENTANA':
                    enbeddedWrapper = {
                        option: options.option,
                        url: options.url,
                        company: options.icons[0],
                    };
                    await this.addEmbedded(enbeddedWrapper);
                    this.breadcrumbList.pop();
                    setSessionStorage(
                        'breadcrumbList',
                        JSON.stringify(this.breadcrumbList)
                    );
                    if(this.optionUrl !== undefined ){
                        window.open(`${this.optionUrl}`);
                    }
                    break;
                default:
                    enbeddedWrapper = {
                        company: options.icons[0],
                    };
                    await this.validateCompanyAccess(enbeddedWrapper);
                    if(this.isValidCompany) {
                        this.iframeUrl = options.url;
                        this.showIframe = true;
                    } else {
                        this.showIframe = false;
                    }
                    break;
            }
        } else {
            this.optionsList = getObjectListByKey(options);
        }
        this.label.title = optionLabel;
    }
    // --- END Options/Menu - c:agentButtonLarge --- //

    // --- Select Agent Modal - c:agentBusinessManagementAgentModal --- //
    /**
     * @function handlerCloseAgentModal
     * Function that handle an event from c:agentBusinessManagementAgentModal
     * Close modal
     * @param {object} event - The event of the custom event.
     * @listens oncloseagentmodal
     * @returns {} - Without return value
     */
    handlerCloseAgentModal(event) {
        event.stopPropagation();
        this.breadcrumbList.pop();
        this.showModal = false;
    }

    /**
     * @function handlerSelectedAgentAndRole
     * Function that handle an event from c:agentBusinessManagementAgentModal
     * Selected Agent account and role
     * @param {object} event - The event of the custom event.
     * @listens onselectedvalues
     * @returns {} - Without return value
     */
    async handlerSelectedAgentAndRole(event) {
        event.stopPropagation();
        const option = findDeepObject(this.breadcrumbList, this.options);
        const selectedAgent = event.detail.agent;
        const selectedRole = event.detail.role;
        let enbeddedWrapper =
            option.option === 'TECNORED'
                ? {
                      option: option.option,
                      url: option.url,
                      account: selectedAgent,
                      company: option.icons[0],
                  }
                : {
                      option: option.option,
                      url: option.url,
                      account: selectedAgent,
                      role: selectedRole.id,
                      userApplication: getUserApplication(
                          this.appsList,
                          option
                      ),
                      company: option.icons[0],
                  };
        await this.addEmbedded(enbeddedWrapper);
        this.showIframe = this.iframeUrl = this.optionUrl;
        this.showModal = false;
    }
    // --- END Select Agent Modal - c:agentBusinessManagementAgentModal --- //
}