import Component from '@glimmer/component';
import OdyButton from '@peek-ui/ember-odyssey/components/button';

export default class PagesAfiiliates extends Component {
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
}
