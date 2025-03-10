import { User, IUser, MOVE_MODES } from '../models/user';

class UserService {
    /**
     * 사용자 생성 또는 수정
     */
    async findOrCreateUser(data: IUser): Promise<IUser> {
        let user: IUser = await this.findUser(data.userId);

        const userData = {
            name: data.name,
            kills: data.kills,
            money: data.money,
            moveMode: {
                WALK: MOVE_MODES.WALK,
                RUN: MOVE_MODES.RUN,
                current: data.moveMode.current
            }
        }
        
        if (!user) {
            user = new User({
                userId: data.userId, ...userData
            });
            await user.save();
        } else {
            this.updateUser(data.userId, { ...userData });
        }
        
        return user;
    }

    async findUser(userId: string): Promise<IUser | null> {
        return await User.findOne({ userId: userId.toString() });
    }

    async listUser(): Promise<IUser[]> {
        return await User.find();
    }

    /**
     * 사용자 정보 업데이트
     */
    async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
        return await User.findOneAndUpdate(
            { userId },
            { $set: updateData },
            { new: true }
        );
    }

    /**
     * 돈 추가
     */
    async addMoney(userId: string, amount: number): Promise<IUser | null> {
        return await User.findOneAndUpdate(
            { userId },
            { $inc: { money: amount } },
            { new: true }
        );
    }

    /**
     * 돈 차감
     */
    async subtractMoney(userId: string, amount: number): Promise<IUser | null> {
        const user = await User.findOne({ userId });
        if (!user || user.money < amount) {
            throw new Error('잔액이 부족합니다.');
        }

        return await User.findOneAndUpdate(
            { userId },
            { $inc: { money: -amount } },
            { new: true }
        );
    }

    /**
     * 몬스터 처치 수 증가
     */
    async incrementKills(userId: string): Promise<IUser | null> {
        return await User.findOneAndUpdate(
            { userId },
            { $inc: { kills: 1 } },
            { new: true }
        );
    }

    /**
     * 경험치 추가 및 레벨업 처리
     */
    async addExperience(userId: string, exp: number): Promise<IUser | null> {
        const user = await User.findOne({ userId });
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }

        const currentExp = (user.exp || 0) + exp;
        const currentLevel = user.level || 1;
        const expForNextLevel = currentLevel * 1000; // 레벨당 1000 경험치 필요

        if (currentExp >= expForNextLevel) {
            return await User.findOneAndUpdate(
                { userId },
                { 
                    $inc: { level: 1 },
                    $set: { exp: currentExp - expForNextLevel }
                },
                { new: true }
            );
        }

        return await User.findOneAndUpdate(
            { userId },
            { $set: { exp: currentExp } },
            { new: true }
        );
    }

    /**
     * 사용자 삭제
     */
    async deleteUser(userId: string): Promise<boolean> {
        const result = await User.deleteOne({ userId });
        return result.deletedCount > 0;
    }
}

export const userService = new UserService();