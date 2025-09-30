import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { CustomLoggingService } from '../common/logging.service';
import { MeasurePerformance, LogMethodCall } from '../common/performance.decorator';

@Injectable()
export class IntervalTaskService {
  private readonly logger = new Logger(IntervalTaskService.name);
  private runningTasks = new Map<string, cron.ScheduledTask>();

  constructor(private readonly loggingService: CustomLoggingService) {}

  @MeasurePerformance('schedule_task')
  @LogMethodCall('debug')
  private scheduleTask(
    name: string,
    cronExpression: string,
    fn: () => Promise<any>,
  ) {
    if (this.runningTasks.has(name)) {
      this.loggingService.warn(`⚠️ Задача "${name}" уже существует`, {
        metadata: { taskName: name, cronExpression }
      });
      return;
    }

    this.loggingService.log(`⏰ Планирование задачи: ${name}`, {
      metadata: { taskName: name, cronExpression, totalTasks: this.runningTasks.size }
    });

    const task = cron.schedule(cronExpression, async () => {
      const taskStartTime = Date.now();
      try {
        await fn();
        const taskDuration = Date.now() - taskStartTime;
        this.loggingService.recordPerformanceMetric(`task_execution_${name}`, taskDuration, {
          taskName: name,
          success: true
        });
      } catch (error) {
        const taskDuration = Date.now() - taskStartTime;
        this.loggingService.recordPerformanceMetric(`task_execution_${name}`, taskDuration, {
          taskName: name,
          success: false,
          error: true
        });
        
        this.loggingService.error(`❌ Ошибка выполнения задачи "${name}"`, error.stack, {
          metadata: { taskName: name, cronExpression },
          error
        });
      }
    });

    this.runningTasks.set(name, task);
    this.loggingService.log(`✅ Задача успешно запланирована: ${name}`, {
      metadata: { taskName: name, totalTasks: this.runningTasks.size }
    });
    
    return task;
  }

  @MeasurePerformance('set_min_interval_task')
  @LogMethodCall('log')
  setMinIntervalTask(
    fn: () => Promise<any>,
    interval = '*/5 * * * *',
    durationInHours = 4,
  ) {
    this.loggingService.log(`⏲️ Настройка интервальной задачи на ${durationInHours} часов`, {
      metadata: { interval, durationInHours, taskName: 'setMinIntervalTask' }
    });

    const task = this.scheduleTask('setMinIntervalTask', interval, fn);

    // Остановка задачи через указанное время
    setTimeout(
      () => {
        this.loggingService.log(`⏹️ Автоматическая остановка задачи после ${durationInHours} часов`, {
          metadata: { taskName: 'setMinIntervalTask', durationInHours }
        });
        this.stopMinIntervalTask();
      },
      durationInHours * 60 * 60 * 1000,
    );

    return task;
  }

  @MeasurePerformance('stop_min_interval_task')
  stopMinIntervalTask() {
    this.loggingService.log('⏹️ Остановка интервальной задачи');
    this.stopTask('setMinIntervalTask');
  }

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

  @MeasurePerformance('stop_5min_interval_task')
  stop5MinIntervalTask9H() {
    this.loggingService.log('⏹️ Остановка 5-минутной интервальной задачи (9 часов)');
    this.stopTask('intervalIn5Minutes9H');
  }

  @MeasurePerformance('stop_task')
  @LogMethodCall('debug')
  stopTask(name: string) {
    const task = this.runningTasks.get(name);
    if (task) {
      this.loggingService.log(`⏹️ Остановка задачи: ${name}`, {
        metadata: { taskName: name, remainingTasks: this.runningTasks.size - 1 }
      });
      task.stop();
      this.runningTasks.delete(name);
    } else {
      this.loggingService.warn(`⚠️ Задача не найдена: ${name}`, {
        metadata: { taskName: name, availableTasks: Array.from(this.runningTasks.keys()) }
      });
    }
  }

  @MeasurePerformance('stop_all_tasks')
  @LogMethodCall('log')
  stopAllTasks() {
    const taskCount = this.runningTasks.size;
    
    this.logger.log(`🛑 Остановка ${taskCount} запущенных задач...`);
    this.loggingService.log(`🛑 Остановка всех задач`, {
      metadata: { taskCount, taskNames: Array.from(this.runningTasks.keys()) }
    });
    
    this.runningTasks.forEach((task, name) => {
      this.logger.log(`⏹️ Остановка задачи: ${name}`);
      this.loggingService.debug(`⏹️ Остановка задачи: ${name}`);
      task.stop();
    });
    
    this.runningTasks.clear();
    this.logger.log('✅ Все задачи успешно остановлены');
    this.loggingService.log('✅ Все задачи успешно остановлены', {
      metadata: { stoppedTaskCount: taskCount }
    });
  }
}
