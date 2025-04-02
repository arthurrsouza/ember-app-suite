import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import OdyButton from '@peek-ui/ember-odyssey/components/button';
import OdyModal from '@peek-ui/ember-odyssey/components/modal';
import OdyIcon from '@peek-ui/ember-odyssey/components/icon';
import OdyFilterMenu from '@peek-ui/ember-odyssey/components/filter-menu';

const ExtensionTrigger = class ExtensionTrigger extends Component {
  @tracked modalIsVisible = false;
  @service intl;

  get equipmentPools() {
    return [...this.args.publicAPI.equipmentPools];
  }

  get selectedEquipmentPool() {
    return this.args.publicAPI.equipmentPools.firstObject;
  }

  @action
  openModal() {
    this.modalIsVisible = true;
  }

  @action
  closeModal() {
    this.modalIsVisible = false;
  }

  @action
  onEquipmentPoolSelect(equipmentPool) {
    console.log(equipmentPool);
  }

  @action
  updateFilters() {

  }

  <template>
    <OdyButton @onClick={{this.openModal}} @variant="tertiary">
      <OdyIcon @source="extension" />
      Daily Annoucements
    </OdyButton>

    <OdyModal
      @isOpen={{this.modalIsVisible}}
      @onClose={{this.closeModal}}
      @title="Daily Annoucements"
    >
      <:body>
        <OdyFilterMenu
          @small={{@small}}
          @filters={{this.equipmentPools}}
          @onFiltersUpdate={{this.updateFilters}}
        >
          <:content as |content|>
            {{#each this.equipmentPools as |filter|}}
              <content.item
                @prop={{filter.id}}
                data-test-manifest-headers-advanced-filters="{{filter.i18n}}"
              >
                {{filter.name}}
              </content.item>
            {{/each}}

          </:content>
        </OdyFilterMenu>
      </:body>
    </OdyModal>
  </template>
};

export default ExtensionTrigger;
