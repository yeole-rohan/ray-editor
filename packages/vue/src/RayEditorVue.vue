<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, defineExpose } from 'vue';
import type { RayEditorOptions } from 'ray-editor';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options?: RayEditorOptions;
    class?: string;
  }>(),
  {
    modelValue: '',
    options: () => ({}),
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const containerRef = ref<HTMLDivElement>();
let editor: import('ray-editor').RayEditor | null = null;

onMounted(async () => {
  if (!containerRef.value) return;

  const { RayEditor } = await import('ray-editor');

  const id = `ray-vue-${Math.random().toString(36).slice(2)}`;
  containerRef.value.id = id;

  editor = new RayEditor(id, {
    ...props.options,
    onChange: (html: string) => emit('update:modelValue', html),
  });

  if (props.modelValue) {
    editor.setContent(props.modelValue);
  }
});

watch(
  () => props.modelValue,
  (v) => {
    if (editor && v !== undefined) {
      const current = editor.getContent();
      if (current !== v) editor.setContent(v);
    }
  }
);

onUnmounted(() => {
  editor?.destroy();
  editor = null;
});

// Expose for template ref access
defineExpose({
  getContent: () => editor?.getContent() ?? '',
  setContent: (html: string) => editor?.setContent(html),
  get editor() { return editor; },
});
</script>

<template>
  <div ref="containerRef" :class="props.class" />
</template>
