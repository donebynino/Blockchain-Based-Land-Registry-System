import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can register a new property",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St, City, State"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), true);
        
        // Verify property was registered
        let getProperty = chain.callReadOnlyFn('land-registry', 'get-property', [
            types.ascii("PROP001")
        ], deployer.address);
        
        const property = getProperty.result.expectSome().expectTuple();
        assertEquals(property['owner'], wallet1.address);
        assertEquals(property['location'], "123 Main St, City, State");
        assertEquals(property['area'], types.uint(1000));
    },
});

Clarinet.test({
    name: "Cannot register duplicate property",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Register first property
        let block1 = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);
        
        assertEquals(block1.receipts[0].result.expectOk(), true);
        
        // Try to register duplicate
        let block2 = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("456 Oak Ave"),
                types.uint(2000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);
        
        assertEquals(block2.receipts[0].result.expectErr(), types.uint(2)); // ERR_ALREADY_REGISTERED
    },
});

Clarinet.test({
    name: "Can transfer property ownership",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Register property
        let block1 = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);
        
        assertEquals(block1.receipts[0].result.expectOk(), true);
        
        // Transfer property
        let block2 = chain.mineBlock([
            Tx.contractCall('land-registry', 'transfer-property', [
                types.ascii("PROP001"),
                types.principal(wallet2.address)
            ], wallet1.address)
        ]);
        
        assertEquals(block2.receipts[0].result.expectOk(), true);
        
        // Verify new owner
        let getProperty = chain.callReadOnlyFn('land-registry', 'get-property', [
            types.ascii("PROP001")
        ], deployer.address);
        
        const property = getProperty.result.expectSome().expectTuple();
        assertEquals(property['owner'], wallet2.address);
    },
});

Clarinet.test({
    name: "Can initiate multi-signature transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        const wallet4 = accounts.get('wallet_4')!;
        
        // Register property
        let block1 = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);
        
        assertEquals(block1.receipts[0].result.expectOk(), true);
        
        // Initiate multi-sig transfer
        let block2 = chain.mineBlock([
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address),
                    types.principal(wallet4.address)
                ]),
                types.uint(1000) // expiration in blocks
            ], wallet1.address)
        ]);
        
        assertEquals(block2.receipts[0].result.expectOk(), true);
        
        // Verify pending transfer exists
        let getPending = chain.callReadOnlyFn('land-registry', 'get-pending-transfer', [
            types.ascii("PROP001")
        ], deployer.address);
        
        const pending = getPending.result.expectSome().expectTuple();
        assertEquals(pending['new-owner'], wallet2.address);
        assertEquals(pending['initiated-by'], wallet1.address);
    },
});

Clarinet.test({
    name: "Can sign multi-signature transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        
        // Setup property and initiate transfer
        let setupBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address),
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ]),
                types.uint(1000)
            ], wallet1.address)
        ]);
        
        assertEquals(setupBlock.receipts[0].result.expectOk(), true);
        assertEquals(setupBlock.receipts[1].result.expectOk(), true);
        
        // Sign the transfer
        let signBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'sign-transfer', [
                types.ascii("PROP001")
            ], wallet3.address)
        ]);
        
        assertEquals(signBlock.receipts[0].result.expectOk(), true);
        
        // Verify signature was recorded
        let getPending = chain.callReadOnlyFn('land-registry', 'get-pending-transfer', [
            types.ascii("PROP001")
        ], deployer.address);
        
        const pending = getPending.result.expectSome().expectTuple();
        const signatures = pending['provided-signatures'].expectList();
        assertEquals(signatures.length, 2); // wallet1 (initiator) + wallet3
    },
});

Clarinet.test({
    name: "Can execute multi-signature transfer when all signatures collected",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;

        // Setup and collect all signatures
        let setupBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address),
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ]),
                types.uint(1000)
            ], wallet1.address),
            Tx.contractCall('land-registry', 'sign-transfer', [
                types.ascii("PROP001")
            ], wallet3.address)
        ]);

        assertEquals(setupBlock.receipts[2].result.expectOk(), true);

        // Execute the transfer (should auto-execute when all signatures collected)
        let executeBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'execute-transfer', [
                types.ascii("PROP001")
            ], wallet1.address)
        ]);

        assertEquals(executeBlock.receipts[0].result.expectOk(), true);

        // Verify ownership changed
        let getProperty = chain.callReadOnlyFn('land-registry', 'get-property', [
            types.ascii("PROP001")
        ], deployer.address);

        const property = getProperty.result.expectSome().expectTuple();
        assertEquals(property['owner'], wallet2.address);

        // Verify pending transfer is cleared
        let getPending = chain.callReadOnlyFn('land-registry', 'get-pending-transfer', [
            types.ascii("PROP001")
        ], deployer.address);

        getPending.result.expectNone();
    },
});

Clarinet.test({
    name: "Can cancel multi-signature transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;

        // Setup transfer
        let setupBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address),
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ]),
                types.uint(1000)
            ], wallet1.address)
        ]);

        assertEquals(setupBlock.receipts[1].result.expectOk(), true);

        // Cancel the transfer
        let cancelBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'cancel-transfer', [
                types.ascii("PROP001")
            ], wallet1.address)
        ]);

        assertEquals(cancelBlock.receipts[0].result.expectOk(), true);

        // Verify pending transfer is cleared
        let getPending = chain.callReadOnlyFn('land-registry', 'get-pending-transfer', [
            types.ascii("PROP001")
        ], deployer.address);

        getPending.result.expectNone();

        // Verify original owner unchanged
        let getProperty = chain.callReadOnlyFn('land-registry', 'get-property', [
            types.ascii("PROP001")
        ], deployer.address);

        const property = getProperty.result.expectSome().expectTuple();
        assertEquals(property['owner'], wallet1.address);
    },
});

Clarinet.test({
    name: "Cannot sign transfer twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;

        // Setup transfer
        let setupBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address),
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ]),
                types.uint(1000)
            ], wallet1.address)
        ]);

        // Try to sign twice
        let signBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'sign-transfer', [
                types.ascii("PROP001")
            ], wallet3.address),
            Tx.contractCall('land-registry', 'sign-transfer', [
                types.ascii("PROP001")
            ], wallet3.address)
        ]);

        assertEquals(signBlock.receipts[0].result.expectOk(), true);
        assertEquals(signBlock.receipts[1].result.expectErr(), types.uint(4)); // ERR_ALREADY_SIGNED
    },
});

Clarinet.test({
    name: "Can add property valuation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const appraiser = accounts.get('wallet_2')!;

        // Register property
        let block1 = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);

        assertEquals(block1.receipts[0].result.expectOk(), true);

        // Add valuation
        let block2 = chain.mineBlock([
            Tx.contractCall('land-registry', 'add-property-valuation', [
                types.ascii("PROP001"),
                types.uint(250000),
                types.principal(appraiser.address),
                types.ascii("MARKET"),
                types.ascii("USD")
            ], deployer.address)
        ]);

        assertEquals(block2.receipts[0].result.expectOk(), true);

        // Verify valuation was recorded
        let getValuation = chain.callReadOnlyFn('land-registry', 'get-latest-valuation', [
            types.ascii("PROP001")
        ], deployer.address);

        const valuation = getValuation.result.expectSome().expectTuple();
        assertEquals(valuation['appraised-value'], types.uint(250000));
        assertEquals(valuation['appraiser'], appraiser.address);
    },
});

Clarinet.test({
    name: "Can add and remove property lien",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const lienHolder = accounts.get('wallet_2')!;

        // Register property
        let block1 = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address)
        ]);

        assertEquals(block1.receipts[0].result.expectOk(), true);

        // Add lien
        let block2 = chain.mineBlock([
            Tx.contractCall('land-registry', 'add-property-lien', [
                types.ascii("PROP001"),
                types.ascii("LIEN001"),
                types.principal(lienHolder.address),
                types.uint(50000),
                types.ascii("MORTGAGE")
            ], deployer.address)
        ]);

        assertEquals(block2.receipts[0].result.expectOk(), true);

        // Verify lien was recorded
        let getLien = chain.callReadOnlyFn('land-registry', 'get-property-lien', [
            types.ascii("PROP001"),
            types.ascii("LIEN001")
        ], deployer.address);

        const lien = getLien.result.expectSome().expectTuple();
        assertEquals(lien['lien-holder'], lienHolder.address);
        assertEquals(lien['amount'], types.uint(50000));
        assertEquals(lien['status'], "ACTIVE");

        // Remove lien
        let block3 = chain.mineBlock([
            Tx.contractCall('land-registry', 'remove-property-lien', [
                types.ascii("PROP001"),
                types.ascii("LIEN001")
            ], deployer.address)
        ]);

        assertEquals(block3.receipts[0].result.expectOk(), true);

        // Verify lien status updated
        let getLienAfter = chain.callReadOnlyFn('land-registry', 'get-property-lien', [
            types.ascii("PROP001"),
            types.ascii("LIEN001")
        ], deployer.address);

        const lienAfter = getLienAfter.result.expectSome().expectTuple();
        assertEquals(lienAfter['status'], "SATISFIED");
    },
});

Clarinet.test({
    name: "Cannot sign expired transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;

        // Setup transfer with very short expiration
        let setupBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address),
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ]),
                types.uint(1) // Expires in 1 block
            ], wallet1.address)
        ]);

        assertEquals(setupBlock.receipts[1].result.expectOk(), true);

        // Mine a block to expire the transfer
        chain.mineEmptyBlock(2);

        // Try to sign expired transfer
        let signBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'sign-transfer', [
                types.ascii("PROP001")
            ], wallet3.address)
        ]);

        assertEquals(signBlock.receipts[0].result.expectErr(), types.uint(5)); // ERR_TRANSFER_EXPIRED
    },
});

Clarinet.test({
    name: "Cannot initiate transfer for non-existent property",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        // Try to initiate transfer for non-existent property
        let block = chain.mineBlock([
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("NONEXISTENT"),
                types.principal(wallet2.address),
                types.list([types.principal(wallet1.address)]),
                types.uint(1000)
            ], wallet1.address)
        ]);

        assertEquals(block.receipts[0].result.expectErr(), types.uint(3)); // ERR_NOT_FOUND
    },
});

Clarinet.test({
    name: "Cannot sign transfer if not a required signer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        const wallet3 = accounts.get('wallet_3')!;
        const wallet4 = accounts.get('wallet_4')!;

        // Setup transfer
        let setupBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'register-property', [
                types.ascii("PROP001"),
                types.utf8("123 Main St"),
                types.uint(1000),
                types.principal(wallet1.address),
                types.ascii("ACTIVE")
            ], deployer.address),
            Tx.contractCall('land-registry', 'initiate-multi-sig-transfer', [
                types.ascii("PROP001"),
                types.principal(wallet2.address),
                types.list([
                    types.principal(wallet1.address),
                    types.principal(wallet3.address)
                ]),
                types.uint(1000)
            ], wallet1.address)
        ]);

        // Try to sign with unauthorized wallet
        let signBlock = chain.mineBlock([
            Tx.contractCall('land-registry', 'sign-transfer', [
                types.ascii("PROP001")
            ], wallet4.address)
        ]);

        assertEquals(signBlock.receipts[0].result.expectErr(), types.uint(6)); // ERR_INVALID_SIGNER
    },
});
