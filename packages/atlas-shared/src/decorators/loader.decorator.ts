import { AutoloaderConstants, KEYS } from '../constants';
import { LoaderServiceQueueItemModel } from '../models';
import { LoaderService } from '../services';
import { container } from 'tsyringe';

/**
 * Define options for autoloader decorator
 */
export interface AutoloadOptionsInterface {
  methodName?: string;
  doneCheckTimeout?: number
}

/**
 * Register @Autoload decorator to mark a class as autoload
 *
 * @param {AutoloaderConstants} type
 * @param {AutoloadOptionsInterface} options
 * @return {MethodDecorator}
 * @constructor
 */
export const Autoload = (
    type: AutoloaderConstants,
    options?: AutoloadOptionsInterface) => {
  return (target: any) => {
    const loaderService = container.resolve(LoaderService);
    const config: LoaderServiceQueueItemModel[] = Reflect.getMetadata(KEYS.LOADER_QUEUE_ITEM, loaderService) || [];

    const defaultOptions = {
      methodName: 'autoStart',
      doneCheckTimeout: 5000,
      ...options
    };

    const queueItemModel: LoaderServiceQueueItemModel = new LoaderServiceQueueItemModel().cast({
      type,
      target,
      ...defaultOptions
    });

    config.push(queueItemModel);

    Reflect.defineMetadata(KEYS.LOADER_QUEUE_ITEM, config, loaderService);

    return target;
  };
};