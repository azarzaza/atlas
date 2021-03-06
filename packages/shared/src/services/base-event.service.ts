import { container, singleton } from 'tsyringe';
import { EventModel, EventServiceInterface } from '../core';
import { UtilsService } from './utils.service';
import { StringResolver } from '../decorators/string-resolver.decorator';
import { EntityHandleModel, ValidateOptionsModel } from '../models';

@StringResolver
@singleton()
export class BaseEventService implements EventServiceInterface {

  /**
   * Contains all events
   *
   * @type {EventModel[]}
   */
  private events: EventModel[] = [];

  /**
   * Contains all handlers for one time events
   *
   * @type {EntityHandleModel[]}
   * @private
   */
  private handlers: EntityHandleModel[] = [];

  /**
   * Return all available listener types for handler decorators
   *
   * @returns {string[]}
   */
  protected get handlerTypes(): string[] {
    return [
      'syncedMetaChange',
      'streamSyncedMetaChange',
      'gameEntityCreate',
      'gameEntityDestroy',
      'entityEnterColshape',
      'entityLeaveColshape'
    ];
  }

  /**
   * Return all available listener types for decorators
   *
   * @returns {string[]}
   * @private
   */
  private get availableDecoratorListenerTypes(): string[] {
    return [
      'on',
      'once',
      'onGui',
      'onServer',
      'onClient',
      'onceServer',
      'onceClient'
    ];
  }

  /**
   * Autostart event service
   * @param {Function} done
   */
  public autoStart(done: CallableFunction): void {
    if (this.events.length) {
      UtilsService.log('Starting ~y~EventService Decorator~w~');
      this.startBaseMethods();
      UtilsService.log('Started ~lg~EventService Decorator~w~');
    }

    if (this.handlers.length) {
      UtilsService.log('Starting ~y~EntityEvent Handle Decorator~w~');
      this.startEntityHandle();
      UtilsService.log('Started ~lg~EntityEvent Handle Decorator~w~');
    }

    done();
  }

  /**
   * Add event to events array
   *
   * @param {string} type
   * @param {string} targetName
   * @param {string} methodName
   * @param options
   */
  public add(type: string, targetName: string, methodName: string, options: ValidateOptionsModel): void {
    if (this.availableDecoratorListenerTypes.includes(type)) {
      const event = new EventModel().cast({ type, eventName: options.name, targetName, methodName });
      this.events.push(event);
    }
  }

  /**
   * Add new game entity handler to array
   *
   * @param {string} type
   * @param {string} targetName
   * @param {string} methodName
   * @param options
   * @private
   */
  public addHandlerMethods(type: string, targetName: string, methodName: string, options: ValidateOptionsModel) {
    if (this.handlerTypes.includes(type)) {
      const entityHandle = new EntityHandleModel().cast({
        type,
        targetName,
        methodName,
        options
      });

      this.handlers.push(entityHandle);
    }
  }

  /**
   * Receive event from server
   *
   * @param {string} eventName
   * @param {(...args: any[]) => void} listener
   */
  public on(eventName: string, listener: (...args: any[]) => void): void {
    UtilsService.eventOn(eventName, listener);
  }

  /**
   * Receive once event from server
   *
   * @param {string} eventName
   * @param {(...args: any[]) => void} listener
   */
  public once(eventName: string, listener: (...args: any[]) => void): void {
    UtilsService.eventOnce(eventName, listener);
  }

  /**
   * Unsubscribe from server event
   *
   * @param {string} eventName
   * @param {(...args: any[]) => void} listener
   */
  public off(eventName: string, listener: (...args: any[]) => void): void {
    UtilsService.eventOff(eventName, listener);
  }

  /**
   * Emit event inside server environment
   *
   * @param {string} eventName
   * @param args
   */
  public emit(eventName: string, ...args: any[]): void {
    UtilsService.eventEmit(eventName, ...args);
  }

  /**
   * Listen for game entity destroy
   *
   * @param {string} type
   * @param {EntityHandleModel[]} handlers
   * @private
   */
  protected listenHandlerForType<T>(type: string, handlers: EntityHandleModel[]) {}

  /**
   * Check and call given handlers
   *
   * @param {T} entity
   * @param {number} entityType
   * @param {EntityHandleModel[]} handlers
   * @param isMetaChange
   * @param {any[]} args
   * @private
   */
  protected handleMetaChangeMethods<T>(entity: T, entityType: number, handlers: EntityHandleModel[], isMetaChange: boolean = false, ...args: any[]) {
    handlers.forEach((handler: EntityHandleModel) => {

      // Stop it not the same type
      const hasSameType = this.isEntityType(entityType, handler.options.entity);
      if (!hasSameType) return;

      const hasMetaKey = handler.options.metaKey !== undefined && args[0] === handler.options.metaKey;
      const instances = container.resolveAll<any>(handler.targetName);

      instances.forEach((instance) => {
        const method: CallableFunction = instance[handler.methodName].bind(instance);

        if (isMetaChange && hasMetaKey) {
          args.shift();
        }

        method(entity, ...args);
      });

    });
  }

  /**
   * Check if given entity has given type
   *
   * @param {number} entityType
   * @param {string} type
   * @protected
   */
  protected isEntityType(entityType: number, type: number): boolean {
    return entityType === type;
  }

  /**
   * Start the entity handler
   *
   * @private
   */
  private startEntityHandle() {
    this.handlerTypes.forEach((type: string) => {
      const handler = this.getHandler(type);

      if (handler.length) {
        this.listenHandlerForType(type, handler);
      }
    });
  }

  /**
   * Return the handler for given type
   *
   * @param {string} type
   * @return {EntityHandleModel[]}
   * @private
   */
  private getHandler(type: string): EntityHandleModel[] {
    return this.handlers.filter((handle: EntityHandleModel) => handle.type === type);
  }

  /**
   * Start the base event service
   *
   * @private
   */
  private startBaseMethods() {
    this.events.forEach((event: EventModel) => {
      const instances = container.resolveAll<any>(event.targetName);
      // Need to be rewrite the typings
      //@ts-ignore
      const internalMethod = this[event.type];

      instances.forEach(async (instance) => {
        if (instance[event.methodName]) {
          const method = internalMethod.bind(this, event.eventName, instance[event.methodName].bind(instance));
          await method();
        }
      });
    });
  }
}
