import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import NavBarItem from '@peek/client/components/nav-bar/item';
import OdyModal from '@peek-ui/ember-odyssey/components/modal';
import OdyTabs from '@peek-ui/ember-odyssey/components/tabs';
import OdyButton from '@peek-ui/ember-odyssey/components/button';
import OdyIcon from '@peek-ui/ember-odyssey/components/icon';
import OdyInput from '@peek-ui/ember-odyssey/components/input';
import OdyDropdownSingle from '@peek-ui/ember-odyssey/components/dropdown-single';
import OdyTable from '@peek-ui/ember-odyssey/components/table';




const TABS_MAP = {
  AFFILIATES: 0,
  AFFILIATE_TYPES: 1,
  SETTINGS: 2,
};

const isTabSelected = (selectedTab, tab) => {
  return selectedTab === tab;
};


const ExtensionTrigger = class ExtensionTrigger extends Component {
  @tracked isModalVisibile = false;
  @tracked selectedTab = 0;

  @service currentUser;

  @tracked affiliateTypes = [];

  @action
  openModal() {
    this.isModalVisibile = true;
  }

  @action
  setSelectedTab(tab) {
    this.selectedTab = tab;
  }

  @action
  saveAffiliateType(affiliateType) {
    this.affiliateTypes = [...this.affiliateTypes, affiliateType];
  }

  <template>
    <NavBarItem>
      <a href="#extensions" {{on "click" this.openModal}}>
        Affiliate Hub
      </a>
    </NavBarItem>

    <OdyModal @isOpen={{this.isModalVisibile}} @openInGlobalElement={{true}}>
      <:body>
        <OdyTabs
          @selected={{this.selectedTab}}
          @onChange={{this.setSelectedTab}}
          as |tabs|
        >
          <tabs.tab>
            Affiliates
          </tabs.tab>
          <tabs.tab>
            Afilliate Types
          </tabs.tab>
          <tabs.tab>
            Settings
          </tabs.tab>
        </OdyTabs>

        {{#if (isTabSelected this.selectedTab TABS_MAP.AFFILIATES)}}
          <PagesAffiliates
            @toAffiliateTypesPage={{fn
              this.setSelectedTab
              TABS_MAP.AFFILIATE_TYPES
            }}
          />
        {{/if}}

        {{#if (isTabSelected this.selectedTab TABS_MAP.AFFILIATE_TYPES)}}
          <PagesAffiliateTypes
            @affiliateTypes={{this.affiliateTypes}}
            @saveAffiliateType={{this.saveAffiliateType}}
          />
        {{/if}}

        {{#if (isTabSelected this.selectedTab TABS_MAP.SETTINGS)}}
          <PagesSettings />
        {{/if}}
      </:body>
    </OdyModal>
  </template>
};

const PagesAffiliates = class PagesAfiiliates extends Component {
  get affiliates() {
    return false;
  }

  <template>
    <style>
      .extensions__affiliates-hub__no-affiliates {
        width: 400px;
        margin: 40px auto;
        text-align: center;
      }

      .extensions__affiliates-hub__no-affiliates h6,
      .extensions__affiliates-hub__no-affiliates p {
        color: var(--color-neutral-300);
      }

      .extensions__affiliates-hub__no-affiliates p {
        margin-top: 32px;
        margin-bottom: 32px;
      }
    </style>

    {{#if this.affiliates}}{{else}}
      <div class="extensions__affiliates-hub__no-affiliates">
        <h6>No Affiliates have signed up yet</h6>
        <p>Complete the Settings Page, Create Affiliate Types, then send invite
          links to potential Affiliates.</p>

        <OdyButton @onClick={{@toAffiliateTypesPage}}>
          Go to Affiliate Types
        </OdyButton>
      </div>
    {{/if}}
  </template>
};

const PagesAffiliateTypes = class PagesAffiliateTypes extends Component {
  @tracked selectedCategory = null;
  @tracked isCreatingType = false;
  @tracked internalName = null;
  @tracked promoCodeDiscount = null;
  @tracked comission = null;

  affiliateCategories = [
    'Airbnb & VRBO Hosts',
    'Influencers & Travel Bloggers',
    'Uber, Lyft, & Taxi Drivers',
    'Travel Agencies',
    'Influencers & Travel Bloggers',
  ];

  affiliateTableColumns = [
    {
      key: 'category',
      label: 'Category',
    },
    {
      key: 'internalName',
      label: 'Internal Name',
    },
    {
      key: 'promoCodeDiscount',
      label: 'Promo Code Discount',
    },
    {
      key: 'comission',
      label: 'Comission',
    },
  ];

  @action
  showCreateAffiliateTypeForm(category) {
    this.selectedCategory = category;

    this.isCreatingType = true;
  }

  @action
  selectCategory(category) {
    this.selectedCategory = category;
  }

  @action
  setInternalName(value) {
    this.internalName = value;
  }

  @action
  setPromoCodeDiscount(value) {
    this.promoCodeDiscount = value;
  }

  @action
  setComission(value) {
    this.comission = value;
  }

  @action
  saveAffilateType() {
    this.args.saveAffiliateType?.({
      affiliateCategory: this.selectedCategory,
      internalName: this.internalName,
      promoCodeDiscount: this.promoCodeDiscount,
      comission: this.comission,
    });

    this.selectedCategory = null;
    this.internalName = null;
    this.promoCodeDiscount = null;
    this.comission = null;
    this.isCreatingType = false;
  }

  <template>
    <style>
      .extensions__affiliates-hub__affiliate-type__title {
        color: var(--color-neutral-300);
        margin: 16px;
      }

      .extensions__affiliates-hub__affiliate-type__create-type-container {
        align-items: start;
        justify-content: center;
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 16px;
      }

      .extensions__affiliates-hub__affiliate-type__create-type__title {
        display: flex;
        align-items: center;
      }

      .extensions__affiliates-hub__affiliate-type__create-type__title p {
        color: var(--color-neutral-400);
        font-size: 20px;
        margin: 0 0 0 8px;
      }

      .extensions__affiliates-hub__affiliate-type__create-type__description {
        color: var(--color-neutral-300);
        font-size: 14px;
      }

      .extensions__affiliates-hub__affiliate-type__categories-container {
        display: grid;
        gap: 16px;
        justify-content: center;
        grid-template-columns: 1fr 1fr;
      }

      .extensions__affiliates-hub__affiliate-type__form {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      .extensions__affiliates-hub__affiliate-type__select-type {
        display: flex;
        padding: 12px;
        border: 1px solid var(--color-neutral-200);
        justify-content: space-between;
        border-radius: 8px;
        flex: 1;
      }

      .extensions__affiliates-hub__affiliate-type__select-type:hover {
        border-color: var(--color-neutral-300);
        cursor: pointer;
      }

      .extensions__affiliates-hub__affiliate-type__select-type p {
        color: var(--color-neutral-300);
        margin: 0;
      }

      .extensions__affiliates-hub__affiliate-type__footer {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }
    </style>

    {{#if this.isCreatingType}}
      <div
        class="extensions__affiliates-hub__affiliate-type__create-type-container"
      >
        <div
          class="extensions__affiliates-hub__affiliate-type__create-type__title"
        >
          <OdyButton
            @variant="ghost"
            @small="true"
            @onClick={{this.clearSelectedType}}
            @iconOnly={{true}}
          >
            <OdyIcon @source="back" />
          </OdyButton>

          <p>Create New Affiliate Type</p>
        </div>

        <p
          class="extensions__affiliates-hub__affiliate-type__create-type__description"
        >Affiliate Types might include “Influencers”, “Airbnb Hosts”, and more
          – invite whoever would best promote your business. Consider using the
          Magic Marketer feature (under Copilot AI) to generate a list of
          influencers.</p>

        <div class="extensions__affiliates-hub__affiliate-type__form">
          <OdyDropdownSingle
            @label="Affiliate Category"
            @options={{this.affiliateCategories}}
            @selected={{this.selectedCategory}}
            @onChange={{this.selectCategory}}
            @allowClear={{false}}
            as |affiliateCategory|
          >
            {{affiliateCategory}}
          </OdyDropdownSingle>

          <OdyInput
            @value={{this.internalName}}
            @label="Internal Name"
            @onChange={{this.setInternalName}}
          />
        </div>

        <p
          class="extensions__affiliates-hub__affiliate-type__create-type__description"
        >Affiliates will be given a Promo Code to share with customers, as well
          as an Affiliate Link that takes customers to your Affiliate Link
          Endpoint set below. If Customers use the Promo Code and/or the
          Affiliate Link, the Affiliate gets the commission you set below:</p>

        <div class="extensions__affiliates-hub__affiliate-type__form">
          <OdyInput
            type="number"
            min="0"
            @label="Promo Code Discount"
            @value={{this.internalPromoCodeDiscount}}
            @onChange={{this.setPromoCodeDiscount}}
            @icon="percent"
          />

          <OdyInput
            type="number"
            min="0"
            @label="Comission"
            @value={{this.comission}}
            @onChange={{this.setComission}}
            @icon="percent"
          />
        </div>

        <div class="extensions__affiliates-hub__affiliate-type__footer">
          <OdyButton @onClick={{this.saveAffilateType}}>
            Create Affiliate Type
          </OdyButton>
        </div>
      </div>
    {{else}}
      {{#if @affiliateTypes.length}}
        <OdyTable
          @columns={{this.affiliateTableColumns}}
          @rows={{@affiliateTypes}}
          @hideLastRowBorder={{true}}
          as |table|
        >
          <table.column as |col|>
            {{col.row.affiliateCategory}}
          </table.column>
          <table.column as |col|>
            {{col.row.internalName}}
          </table.column>
          <table.column as |col|>
            {{col.row.promoCodeDiscount}}
          </table.column>
          <table.column as |col|>
            {{col.row.comission}}
          </table.column>
        </OdyTable>
      {{else}}
        <p class="extensions__affiliates-hub__affiliate-type__title">Create an
          Affiliate Type to get started!</p>

        <div
          class="extensions__affiliates-hub__affiliate-type__categories-container"
        >
          {{#each this.affiliateCategories as |affiliateCategory|}}
            <div
              class="extensions__affiliates-hub__affiliate-type__select-type"
              {{on
                "click"
                (fn this.showCreateAffiliateTypeForm affiliateCategory)
              }}
            >
              <p>{{affiliateCategory}}</p>
              <OdyIcon @source="carat-forward" />
            </div>
          {{/each}}
        </div>
      {{/if}}
    {{/if}}
  </template>
};

const PagesSettings = class PagesSettings extends Component {
  <template>
    <h1>Settings</h1>
  </template>
};

export default ExtensionTrigger;
