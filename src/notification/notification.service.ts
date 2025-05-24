import { Injectable } from '@nestjs/common';
import { IntervalTaskService } from 'src/services/interval-task.service';
import { CustomLoggingService } from '../common/logging.service';

@Injectable()
export class NotificationService {
    constructor(
        private readonly interval: IntervalTaskService,
        private readonly loggingService: CustomLoggingService
    ) { }

    startNotification(func: () => void, interval: number = 10) {
        const hoursUntil18 = this.getHoursUntil18()
        
        this.loggingService.log(`Starting notification with interval ${interval} minutes`, {
            metadata: { interval, hoursUntil18 }
        });

        this.interval.setMinIntervalTask(async () => {
            const startTime = Date.now();
            const status = this.getRandomBoolean();
            
            try {
                if (status) {
                    func();
                    this.loggingService.logNotification('random_notification', 'system', true);
                } else {
                    this.loggingService.log('Random notification skipped', {
                        metadata: { interval, hoursRemaining: this.getHoursUntil18() }
                    });
                }

                const duration = Date.now() - startTime;
                this.loggingService.recordPerformanceMetric('notification_check', duration, {
                    interval,
                    sent: status,
                    hoursRemaining: this.getHoursUntil18()
                });

                console.log(`Запуск уведомления с интервалом ${interval} мин.`)
                console.log(`До конца осталось ${this.getHoursUntil18()} часов`);
                console.log(`Уведомление ${status ? 'отправлено' : 'не отправлено'}`);
                
            } catch (error) {
                const duration = Date.now() - startTime;
                this.loggingService.recordPerformanceMetric('notification_check', duration, {
                    interval,
                    sent: false,
                    error: true
                });
                
                this.loggingService.logNotification('random_notification', 'system', false, error as Error);
                throw error;
            }
        }, `*/${interval} * * * *`, hoursUntil18);
    }

    stopNotification() {
        this.loggingService.log('Stopping all notifications');
        this.interval.stopAllTasks();
        this.loggingService.log('All notifications stopped successfully');
    }

    private readonly getRandomBoolean = (): boolean => Math.random() < 0.5;

    private readonly getHoursUntil18 = (): number => {
        const now = new Date();
        const target = new Date();

        target.setHours(18, 0, 0, 0);
        if (now.getHours() >= 18) {
            target.setDate(target.getDate() + 1);
        }
        const diffMs = target.getTime() - now.getTime();
        return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    };
}
