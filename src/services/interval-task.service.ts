import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';

@Injectable()
export class IntervalTaskService {
  private readonly logger = new Logger(IntervalTaskService.name);
  private runningTasks = new Map<string, cron.ScheduledTask>();

  private scheduleTask(
    name: string,
    cronExpression: string,
    fn: () => Promise<any>,
  ) {
    if (this.runningTasks.has(name)) {
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        await fn();
      } catch (error) {
        console.error(`Error in task ${name}:`, error);
      }
    });

    this.runningTasks.set(name, task);
    return task;
  }

  setMinIntervalTask(
    fn: () => Promise<any>,
    interval = '*/5 * * * *',
    durationInHours = 4,
  ) {
    const task = this.scheduleTask('setMinIntervalTask', interval, fn);

    // Остановка задачи через 4 часа
    setTimeout(
      () => {
        this.stopMinIntervalTask();
      },
      durationInHours * 60 * 60 * 1000,
    ); // 4 часа в миллисекундах

    return task;
  }

  stopMinIntervalTask = () => {
    this.stopTask('setMinIntervalTask');
  };

  set5MinIntervalTask9H(
    fn: () => Promise<any>,
    interval = '*/5 * * * *',
    durationInHours = 9,
  ) {
    const task = this.scheduleTask('intervalIn5Minutes9H', interval, fn);

    // Остановка задачи через 4 часа
    setTimeout(
      () => {
        this.stop5MinIntervalTask9H();
      },
      durationInHours * 60 * 60 * 1000,
    ); // 8 часа в миллисекундах

    return task;
  }

  stop5MinIntervalTask9H = () => {
    this.stopTask('intervalIn5Minutes9H');
  };

  stopTask = (name: string) => {
    const task = this.runningTasks.get(name);
    if (task) {
      task.stop();
      this.runningTasks.delete(name);
    }
  };

  stopAllTasks = () => {
    this.logger.log(`🛑 Stopping ${this.runningTasks.size} running tasks...`);
    
    this.runningTasks.forEach((task, name) => {
      this.logger.log(`⏹️ Stopping task: ${name}`);
      task.stop();
    });
    
    this.runningTasks.clear();
    this.logger.log('✅ All tasks stopped successfully');
  };
}
