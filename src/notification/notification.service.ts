import { Injectable } from '@nestjs/common';
import { IntervalTaskService } from 'src/services/interval-task.service';
import { CustomLoggingService } from '../common/logging.service';

@Injectable()
export class NotificationService {
    private doubleNotificationEnabled = false;
    private secondNotificationFunc: (() => void) | null = null;
    private pendingSecondNotifications: NodeJS.Timeout[] = [];

    constructor(
        private readonly interval: IntervalTaskService,
        private readonly loggingService: CustomLoggingService
    ) { }

    enableDoubleNotification(enabled: boolean) {
        this.doubleNotificationEnabled = enabled;
        this.loggingService.log(`🔔 Режим двойных уведомлений: ${enabled ? 'включен' : 'выключен'}`);
        
        // Если выключаем режим, отменяем все запланированные вторые уведомления
        if (!enabled) {
            this.cancelPendingSecondNotifications();
        }
    }

    isDoubleNotificationEnabled(): boolean {
        return this.doubleNotificationEnabled;
    }

    setSecondNotificationFunc(func: () => void) {
        this.secondNotificationFunc = func;
    }

    private cancelPendingSecondNotifications() {
        for (const timeout of this.pendingSecondNotifications) {
            clearTimeout(timeout);
        }
        this.pendingSecondNotifications = [];
        this.loggingService.log('🚫 Отменены все запланированные вторые уведомления');
    }

    startNotification(func: () => void, interval: number = 10) {
        const hoursUntil18 = this.getHoursUntil18()
        
        this.loggingService.log(`🔔 Запуск системы уведомлений`, {
            metadata: { 
                interval: `${interval} мин`, 
                hoursUntil18: `${hoursUntil18} ч`,
                doubleMode: this.doubleNotificationEnabled ? 'включен' : 'выключен'
            }
        });

        this.interval.setMinIntervalTask(async () => {
            const startTime = Date.now();
            const status = this.getRandomBoolean();
            
            try {
                if (status) {
                    func();
                    this.loggingService.logNotification('random_notification', 'system', true);

                    // Если включен режим двойных уведомлений, запускаем таймер на второе уведомление
                    if (this.doubleNotificationEnabled && this.secondNotificationFunc) {
                        this.loggingService.log('⏱️ Запуск таймера для второго уведомления (1 минута)');
                        
                        const timeout = setTimeout(() => {
                            try {
                                this.secondNotificationFunc();
                                this.loggingService.logNotification('second_notification', 'system', true);
                                this.loggingService.log('📬 Второе уведомление отправлено');
                            } catch (error) {
                                this.loggingService.logNotification('second_notification', 'system', false, error as Error);
                            }
                            
                            // Удаляем таймаут из массива после выполнения
                            const index = this.pendingSecondNotifications.indexOf(timeout);
                            if (index > -1) {
                                this.pendingSecondNotifications.splice(index, 1);
                            }
                        }, 60000); // 1 минута = 60000 миллисекунд

                        this.pendingSecondNotifications.push(timeout);
                    }
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
        this.cancelPendingSecondNotifications();
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
