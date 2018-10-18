import { observable } from 'mobx';
import { Renderable } from '../../renders/renderrable';

export type Task = {
  title: Renderable;
  errorText?: Renderable;
  status: 'pending' | 'waiting' | 'failure' | 'success';
};

export abstract class Test {
  id: string = '';
  @observable title: string = '';
  @observable downside: string | any = '';

  @observable isSuccess: boolean = true;
  @observable isDone: boolean = false;
  @observable isPending: boolean = false;

  @observable display: Task[] = [];

  abstract async resolve(): Promise<void>;
}