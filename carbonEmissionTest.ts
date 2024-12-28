// Carbon Emission 계산 테스트

// 초기 설정
let metrics = {
    carbonEmission: 0  // 초기값
};

// 테스트 함수
function updateMetricsTest(currentEmission: number, iteration: number = 1) {
    console.log(`\n테스트 시작 (초기 emission: ${currentEmission})`);
    
    let testMetrics = { carbonEmission: 0 };  // 매 테스트마다 초기화
    
    for (let i = 0; i < iteration; i++) {
        const randomFactor = 0.25 + Math.random() * 1.0;  // 0.25 ~ 1.25
        const newValue = Math.max(
            0,
            testMetrics.carbonEmission + (currentEmission * randomFactor)
        );
        
        console.log(`반복 ${i + 1}:`);
        console.log(`- Random Factor: ${randomFactor.toFixed(4)}`);
        console.log(`- 계산: ${testMetrics.carbonEmission} + (${currentEmission} * ${randomFactor.toFixed(4)})`);
        console.log(`- 새로운 값: ${newValue.toFixed(6)}`);
        
        testMetrics.carbonEmission = newValue;
    }
    
    return testMetrics.carbonEmission;
}

// 걷기 모드 테스트 (carbonEmission: 0.0001)
console.log("=== 걷기 모드 테스트 (10회 반복) ===");
const walkResult = updateMetricsTest(0.0001, 10);
console.log(`최종 결과: ${walkResult.toFixed(6)}`);

// 달리기 모드 테스트 (carbonEmission: 0.0007)
console.log("\n=== 달리기 모드 테스트 (10회 반복) ===");
const runResult = updateMetricsTest(0.0007, 10);
console.log(`최종 결과: ${runResult.toFixed(6)}`);

export {};  // TypeScript 모듈로 만들기 위한 빈 export
