
const Form = <template>
	<FormCard></FormCard>
	<FormInputCheckbox></FormInputCheckbox>
</template>;

const FormCard = <template>
    <FormButton></FormButton>
</template>;

const FormButton = <template>
    <button>Click! </button>
</template>;

const FormInputCheckbox = <template>
    <input type="checkbox" />
</template>;

export default Form;
