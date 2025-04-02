import Component from '@glimmer/component';
import OdyButton from '@peek-ui/ember-odyssey/components/button';
import { action } from '@ember/object';

export default class FormCard extends Component {
    @action
    handleClick() {
        console.log('Button clicked!');
    }

    <template>
        <style>body { background-color: red; }</style>
        <OdyButton @onClic={{this.handleClick}}>Click Me</OdyButton>
    </template>
}