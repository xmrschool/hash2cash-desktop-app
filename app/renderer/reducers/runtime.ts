import { SET_RUNTIME_VARIABLE } from 'store/action-types';
import { IActionWithPayload } from 'actions/helpers';

export type RuntimeState = {
  [state: string]: any;
};

export type RuntimePayload = {
  name: string;
  value: any;
};

export default function runtime(
  state: RuntimeState = {},
  action: IActionWithPayload<RuntimePayload>,
): RuntimeState {
  switch (action.type) {
    case SET_RUNTIME_VARIABLE:
      return {
        ...state,
        [action.payload.name]: action.payload.value,
      };
    default:
      return state;
  }
}
