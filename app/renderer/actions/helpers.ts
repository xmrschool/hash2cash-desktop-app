import { Action } from 'redux';

export interface IAction extends Action {}
export interface IActionWithPayload<T> extends IAction {
  readonly payload: T;
}