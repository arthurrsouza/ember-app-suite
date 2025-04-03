import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import { fn } from '@ember/helper';

import PagesAffiliates from 'ember-app-suite/components/pages/affiliates';
import PagesAffiliateTypes from 'ember-app-suite/components/pages/affiliate-types';
import PagesSettings from 'ember-app-suite/components/pages/settings';

import NavBarItem from '@peek/client/components/nav-bar/item';
import OdyModal from '@peek-ui/ember-odyssey/components/modal';
import OdyTabs from '@peek-ui/ember-odyssey/components/tabs';

const TABS_MAP = {
  AFFILIATES: 0,
  AFFILIATE_TYPES: 1,
  SETTINGS: 2,
};

const isTabSelected = (selectedTab, tab) => {
  return selectedTab === tab;
};

export default class ExtensionTrigger extends Component {
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
}
