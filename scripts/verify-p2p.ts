// Mock chrome API
const globalAny = globalThis as unknown as {
    chrome: {
        storage: {
            local: {
                get: () => Promise<unknown>;
                set: () => Promise<void>;
            };
        };
        runtime: {
            sendMessage: () => void;
            onMessage: { addListener: () => void };
        };
    };
};

globalAny.chrome = {
    storage: {
        local: {
            get: async () => ({}),
            set: async () => { },
        },
    },
    runtime: {
        sendMessage: () => { },
        onMessage: { addListener: () => { } },
    },
};

// Mock Trystero joinRoom manually since we are not in Jest
// const mockMakeAction = () => [() => { }, () => { }];
// Used to mock the module if we were using Jest, but here we just need to ensure it runs
/*
const _mockJoinRoom = () => ({
    makeAction: mockMakeAction,
    onPeerJoin: () => { },
    onPeerLeave: () => { },
    leave: () => { },
});
*/

// We need to intercept the import of 'trystero'
// Since we are running in ts-node, we can't easily mock imports like Jest.
// However, we can just test the logic assuming imports work, OR we can rely on integration test.
// Given strict instructions to verify, I will create a simpler test that imports the classes and manually injects dependencies if possible.
// But P2PNetwork imports 'trystero' directly.

// Strategy: Just run the script. If trystero is installed, it will load. 
// Trystero in Node environment might try to start a server or fail.
// Let's try to run it and see.

import { P2PPrivacyNetwork } from '../lib/p2p-privacy-network';
import { PrivacyScoreCalculator } from '../lib/privacy-score';

async function test() {
    console.log('🧪 Testing P2P Network Logic...');

    try {
        const network = P2PPrivacyNetwork.getInstance();
        await network.initializeNetwork();

        console.log('✅ P2P Network initialized');

        const stats = network.getCommunityStats();
        console.log('✅ Initial Community Stats:', stats || 'Wait for peers (Expected)');

        // Test Reputation calculation (will use local fallback since no peers)
        console.log('Checking Privacy Score (Fallback mode)...');

        // We expect this to default to local calculation because no peers are connected
        const result = await PrivacyScoreCalculator.calculateDomainScore('example.com');
        console.log('✅ Score calculated:', result);

        if (result.score > 0 && result.grade) {
            console.log('🎉 Verification passed: Logic executes without crashing');
        } else {
            console.error('❌ Verification failed: Invalid result');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

test();
