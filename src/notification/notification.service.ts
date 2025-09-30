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
        
        this.loggingService.log(`🔔 Запуск системы уведомлений`, {
            metadata: { 
                interval: `${interval} мин`, 
                hoursUntil18: `${hoursUntil18} ч` 
            }
        });

        this.interval.setMinIntervalTask(async () => {
            const startTime = Date.now();
            const status = this.getRandomBoolean();
            
            try {
                if (status) {
                    func();
                    this.loggingService.logNotification('random_notification', 'system', true);
                } else {
                    this.loggingService.debug('⏭️ Уведомление пропущено (случайный выбор)', {
                        metadata: { interval, hoursRemaining: this.getHoursUntil18() }
                    });
                }

                const duration = Date.now() - startTime;
                this.loggingService.recordPerformanceMetric('notification_check', duration, {
                    interval,
                    sent: status,
                    hoursRemaining: this.getHoursUntil18()
                });

                this.loggingService.log(`📬 Проверка уведомлений`, {
                    metadata: {
                        interval: `${interval} мин`,
                        hoursRemaining: `${this.getHoursUntil18()} часов`,
                        status: status ? '✅ отправлено' : '⏭️ пропущено'
                    }
                });
                
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
        this.loggingService.log('🔕 Остановка всех уведомлений');
        this.interval.stopAllTasks();
        this.loggingService.log('✅ Все уведомления успешно остановлены');
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
