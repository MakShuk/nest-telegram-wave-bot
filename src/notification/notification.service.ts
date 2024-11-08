import { Injectable } from '@nestjs/common';
import { IntervalTaskService } from 'src/services/interval-task.service';

@Injectable()
export class NotificationService {
    constructor(private readonly interval: IntervalTaskService) { }

    startNotification(func: () => void, interval: number = 10) {
        const hoursUntil18 = this.getHoursUntil18()
        this.interval.setMinIntervalTask(async () => {
            const status = this.getRandomBoolean() 
            status ? func() : null
            console.log(`Запуск уведомления с интервалом ${interval} мин.`)
            console.log(`До конца осталось ${hoursUntil18} часов`);
            console.log(`Уведомление ${status ? 'отправлено' : 'не отправлено'}`);
        }, `*/${interval} * * * *`, hoursUntil18);
    }

    stopNotification() {
        this.interval.stopAllTasks()
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
