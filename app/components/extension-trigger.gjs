import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import OdyButton from '@peek-ui/ember-odyssey/components/button';
import OdyModal from '@peek-ui/ember-odyssey/components/modal';

export default class ExtensionTrigger extends Component {
	@tracked modalIsVisible = false;

	@action
	openModal() {
		this.modalIsVisible =true
	}

	<template>
		<OdyButton @onClick={{this.openModal}}>Trigger Extension</OdyButton>

		<OdyModal @isOpen={{this.modalIsVisible}}>
			Hello!
		</OdyModal>
	</template>
}