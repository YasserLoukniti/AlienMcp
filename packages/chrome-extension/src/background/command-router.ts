import { handleScreenshot } from './handlers/screenshot';
import { handleNavigate } from './handlers/navigate';
import { handleClick } from './handlers/click';
import { handleExecuteJs } from './handlers/execute-js';
import { handleReadPage } from './handlers/read-page';
import { handleModifyDom } from './handlers/modify-dom';
import { handleNetwork } from './handlers/network';
import { handleTabs } from './handlers/tabs';
import { handleFindElement } from './handlers/find-element';
import { handleConsole } from './handlers/console';
import { handleFormInput } from './handlers/form-input';
import { handleContext } from './handlers/context';
import { handleType } from './handlers/type';
import { handleScroll } from './handlers/scroll';
import { handleWait } from './handlers/wait';
import { handleHover } from './handlers/hover';
import { handleCookies } from './handlers/cookies';
import { handleStorage } from './handlers/storage';
import { handlePdf } from './handlers/pdf';
import { handleEmulate } from './handlers/emulate';

type CommandHandler = (args: Record<string, unknown>) => Promise<unknown>;

export class CommandRouter {
  private handlers: Map<string, CommandHandler> = new Map();

  constructor() {
    this.handlers.set('screenshot', handleScreenshot);
    this.handlers.set('navigate', handleNavigate);
    this.handlers.set('click', handleClick);
    this.handlers.set('executeJs', handleExecuteJs);
    this.handlers.set('readPage', handleReadPage);
    this.handlers.set('modifyDom', handleModifyDom);
    this.handlers.set('network', handleNetwork);
    this.handlers.set('tabs', handleTabs);
    this.handlers.set('findElement', handleFindElement);
    this.handlers.set('console', handleConsole);
    this.handlers.set('formInput', handleFormInput);
    this.handlers.set('context', handleContext);
    this.handlers.set('type', handleType);
    this.handlers.set('scroll', handleScroll);
    this.handlers.set('wait', handleWait);
    this.handlers.set('hover', handleHover);
    this.handlers.set('cookies', handleCookies);
    this.handlers.set('storage', handleStorage);
    this.handlers.set('pdf', handlePdf);
    this.handlers.set('emulate', handleEmulate);
  }

  async route(command: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.handlers.get(command);
    if (!handler) {
      throw new Error(`Unknown command: ${command}`);
    }
    return handler(args);
  }

  hasCommand(command: string): boolean {
    return this.handlers.has(command);
  }

  getCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}
