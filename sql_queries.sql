--- all invalid BTC contributers (not a 1... address)
SELECT * FROM inputs_btcs,outputs_btcs,transactions_btcs WHERE 
    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
      OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
    AND inputs_btcs.converted_eth_address IS NULL;

--- check if you can recover something (if it's not the only input)
SELECT * FROM inputs_btcs WHERE inputs_btcs.transactions_btc_uuid IN 
    (SELECT transactions_btcs.uuid FROM inputs_btcs,outputs_btcs,transactions_btcs WHERE 
    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
      OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')

--- all valid BTC contributers
SELECT * FROM inputs_btcs,outputs_btcs,transactions_btcs WHERE 
    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
      OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
    AND inputs_btcs.index=0.0
    AND inputs_btcs.converted_eth_address NOTNULL;
 
--- select all valid first phase btc contributers    
SELECT * FROM inputs_btcs,outputs_btcs,transactions_btcs WHERE 
    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
      OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
    AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
    AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
    AND transactions_btcs.time>1491224700   --- this is just when phase 1 starts
    AND transactions_btcs.time<1496063100;  --- this is just before phase 2 starts

--- select all valid first phase btc contributers and calculate their tokens
SELECT *,(outputs_btcs.value*23.6941*rates."avgRate")/100000000 AS aeternityTokens --- 23.6941 was the fixed rate, 100000000 is bitcoin to satoshi conversion
FROM inputs_btcs,outputs_btcs,transactions_btcs,rates WHERE 
    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
      OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
    AND rates.currency='ETH_AETERNITY'
    AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time --- join on the rates

    AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time --- join on the rates

    AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
    AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
    AND transactions_btcs.time>1491224700   --- this is just when phase 1 starts
    AND transactions_btcs.time<1496063100;  --- this is just before phase 2 starts


--- select all valid second phase btc contributers    
SELECT * FROM inputs_btcs,outputs_btcs,transactions_btcs WHERE 
    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
      OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
    AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
    AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
    AND transactions_btcs.time>1496063100;  --- this is just before phase 2 starts

--- select all valid second phase btc contributers and calculate their tokens, this takes a while, due to suquery query...
SELECT *,(btctoeth_helper_suquery.ethereum_conversion*rates."avgRate") AS aeternityTokens --- 100000000 is bitcoin to satoshi conversion
FROM inputs_btcs,outputs_btcs,transactions_btcs,rates,
    (SELECT distinct(transactions_btcs.time),(outputs_btcs.value/rates."avgRate")/100000000 AS ethereum_conversion --- 100000000 is bitcoin to satoshi conversion
    FROM inputs_btcs,outputs_btcs,transactions_btcs,rates 
        WHERE 
            outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
            AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
            AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
              OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
            AND rates.currency='BTC_ETH'
            AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time
            AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time
            AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
            AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
            AND transactions_btcs.time>1496063100) AS btctoeth_helper_suquery
    WHERE 
        outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
        AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
        AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
          OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
        AND rates.currency='ETH_AETERNITY'
        AND btctoeth_helper_suquery.time=transactions_btcs.time --- join the table on the time
        AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time --- join on the rates

        AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time --- join on the rates

        AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
        AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
        AND transactions_btcs.time>1496063100;  --- this is just before phase 2 starts

--- select all valid first phase eth contributers
SELECT * FROM transactions_eths
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1491224700   --- this is just when phase 1 starts
         AND transactions_eths."timeStamp"<1496063100;  --- this is just before phase 2 starts

--- select all valid second phase eth contributers
SELECT * FROM transactions_eths
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1496063100;  --- this is just before phase 2 starts

--- select all valid first phase eth contributers and calculate their tokens
SELECT *,(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS aeternityTokens FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND rates.currency='ETH_AETERNITY'
         AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
         AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1491224700   --- this is just when phase 1 starts
         AND transactions_eths."timeStamp"<1496063100; 


--- select all valid second phase eth contributers and calculate their tokens
SELECT *,(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS aeternityTokens FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND rates.currency='ETH_AETERNITY'
         AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
         AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1496063100; 

--- select all valid eth contributers and calculate their tokens
SELECT *,(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS aeternityTokens FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND rates.currency='ETH_AETERNITY'
         AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
         AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1491224700;   --- this is just when phase 1 starts 



--- phase 2 USD amount calc from ETH side
SELECT *,(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS usdvalue FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND rates.currency='USDT_ETH'
         AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
         AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1496063100; 

--- phase 2 USD amount calc from BTC side
SELECT *,(outputs_btcs.value*rates."avgRate")/100000000 AS usdvalue --- 100000000 is bitcoin to satoshi conversion
    FROM inputs_btcs,outputs_btcs,transactions_btcs,rates 
        WHERE 
            outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
            AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
            AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
              OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
            AND rates.currency='USDT_BTC'
            AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time
            AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time
            AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
            AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
            AND transactions_btcs.time>1496063100;


--- time and money (USD) ETH query used for cap reach calc
SELECT transactions_eths."timeStamp",(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS usdvalue FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
    WHERE 
         (
               LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e')
               OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') 
               OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') 
               OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') 
               OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') 
               OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') 
               OR LOWER(transactions_eths.to)=LOWER('0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8')
         )
         AND rates.currency='USDT_ETH'
         AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
         AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
         AND confirmations NOTNULL
         AND transactions_eths."timeStamp">1496063100; 

--- time and money (USD) BTC query used for cap reach calc
SELECT transactions_btcs.time,(outputs_btcs.value*rates."avgRate")/100000000 AS usdvalue --- 100000000 is bitcoin to satoshi conversion
    FROM inputs_btcs,outputs_btcs,transactions_btcs,rates 
        WHERE 
            outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
            AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
            AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' 
              OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz')
            AND rates.currency='USDT_BTC'
            AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time
            AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time
            AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
            AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
            AND transactions_btcs.time>1496063100;



--- convert datetime to numeric timestamp
SELECT extract(epoch FROM now() AT TIME zone 'utc');
