import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  alternatives: Annotation({
    reducer: (current, update) => update ?? current ?? [],
    default: () => [],
  }),
});