// Storage 테스트

interface PlayerStats {
    id: string;
    name: string;
    money: number;
    moveMode: {
        WALK: {
            speed: number;
            title: string;
            carbonEmission: number;
        };
        RUN: {
            speed: number;
            title: string;
            carbonEmission: number;
        };
        current: 'WALK' | 'RUN';
    }
}

interface PlayerStorageData {
    user?: PlayerStats;
}

// 테스트용 mock 함수들
const mockStorage: PlayerStorageData = {
    user: {
        id: "test123",
        name: "테스트 플레이어",
        money: 100,
        moveMode: {
            WALK: {
                speed: 80,
                title: "🚶🏻 걷기",
                carbonEmission: 0.0001
            },
            RUN: {
                speed: 150,
                title: "🏃🏻 달리기",
                carbonEmission: 0.0007
            },
            current: 'WALK'
        }
    }
};

// Storage 제거 테스트
function testStorageRemoval() {
    console.log("\n=== Storage 제거 테스트 시작 ===");
    
    // 초기 상태 출력
    console.log("1. 초기 storage 상태:");
    console.log(JSON.stringify(mockStorage, null, 2));
    
    // storage.user를 undefined로 설정
    mockStorage.user = undefined;
    
    // 제거 후 상태 출력
    console.log("\n2. storage.user = undefined 후 상태:");
    console.log(JSON.stringify(mockStorage, null, 2));
    
    // 객체 속성 접근 테스트
    console.log("\n3. 제거된 데이터 접근 테스트:");
    console.log(`- storage.user: ${mockStorage.user}`);
    console.log(`- storage.user?.id: ${mockStorage.user?.id}`);
    console.log(`- storage.user?.moveMode?.current: ${mockStorage.user?.moveMode?.current}`);
}

// 테스트 실행
testStorageRemoval();

export {};  // TypeScript 모듈로 만들기 위한 빈 export
