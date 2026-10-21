// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract Halo2Verifier {
    uint256 internal constant    DELTA = 4131629893567559867359510883348571134090853742863529169391034518566172092834;
    uint256 internal constant        R = 21888242871839275222246405745257275088548364400416034343698204186575808495617; 

    uint256 internal constant FIRST_QUOTIENT_X_CPTR = 0x06a4;
    uint256 internal constant  LAST_QUOTIENT_X_CPTR = 0x07a4;

    uint256 internal constant                VK_MPTR = 0x0960;
    uint256 internal constant         VK_DIGEST_MPTR = 0x0960;
    uint256 internal constant     NUM_INSTANCES_MPTR = 0x0980;
    uint256 internal constant                 K_MPTR = 0x09a0;
    uint256 internal constant             N_INV_MPTR = 0x09c0;
    uint256 internal constant             OMEGA_MPTR = 0x09e0;
    uint256 internal constant         OMEGA_INV_MPTR = 0x0a00;
    uint256 internal constant    OMEGA_INV_TO_L_MPTR = 0x0a20;
    uint256 internal constant   HAS_ACCUMULATOR_MPTR = 0x0a40;
    uint256 internal constant        ACC_OFFSET_MPTR = 0x0a60;
    uint256 internal constant     NUM_ACC_LIMBS_MPTR = 0x0a80;
    uint256 internal constant NUM_ACC_LIMB_BITS_MPTR = 0x0aa0;
    uint256 internal constant              G1_X_MPTR = 0x0ac0;
    uint256 internal constant              G1_Y_MPTR = 0x0ae0;
    uint256 internal constant            G2_X_1_MPTR = 0x0b00;
    uint256 internal constant            G2_X_2_MPTR = 0x0b20;
    uint256 internal constant            G2_Y_1_MPTR = 0x0b40;
    uint256 internal constant            G2_Y_2_MPTR = 0x0b60;
    uint256 internal constant      NEG_S_G2_X_1_MPTR = 0x0b80;
    uint256 internal constant      NEG_S_G2_X_2_MPTR = 0x0ba0;
    uint256 internal constant      NEG_S_G2_Y_1_MPTR = 0x0bc0;
    uint256 internal constant      NEG_S_G2_Y_2_MPTR = 0x0be0;

    uint256 internal constant CHALLENGE_MPTR = 0x1440;

    uint256 internal constant THETA_MPTR = 0x1440;
    uint256 internal constant  BETA_MPTR = 0x1460;
    uint256 internal constant GAMMA_MPTR = 0x1480;
    uint256 internal constant     Y_MPTR = 0x14a0;
    uint256 internal constant     X_MPTR = 0x14c0;
    uint256 internal constant  ZETA_MPTR = 0x14e0;
    uint256 internal constant    NU_MPTR = 0x1500;
    uint256 internal constant    MU_MPTR = 0x1520;

    uint256 internal constant       ACC_LHS_X_MPTR = 0x1540;
    uint256 internal constant       ACC_LHS_Y_MPTR = 0x1560;
    uint256 internal constant       ACC_RHS_X_MPTR = 0x1580;
    uint256 internal constant       ACC_RHS_Y_MPTR = 0x15a0;
    uint256 internal constant             X_N_MPTR = 0x15c0;
    uint256 internal constant X_N_MINUS_1_INV_MPTR = 0x15e0;
    uint256 internal constant          L_LAST_MPTR = 0x1600;
    uint256 internal constant         L_BLIND_MPTR = 0x1620;
    uint256 internal constant             L_0_MPTR = 0x1640;
    uint256 internal constant   INSTANCE_EVAL_MPTR = 0x1660;
    uint256 internal constant   QUOTIENT_EVAL_MPTR = 0x1680;
    uint256 internal constant      QUOTIENT_X_MPTR = 0x16a0;
    uint256 internal constant      QUOTIENT_Y_MPTR = 0x16c0;
    uint256 internal constant          R_EVAL_MPTR = 0x16e0;
    uint256 internal constant   PAIRING_LHS_X_MPTR = 0x1700;
    uint256 internal constant   PAIRING_LHS_Y_MPTR = 0x1720;
    uint256 internal constant   PAIRING_RHS_X_MPTR = 0x1740;
    uint256 internal constant   PAIRING_RHS_Y_MPTR = 0x1760;

    function verifyProof(
        bytes calldata proof,
        uint256[] calldata instances
    ) public returns (bool) {
        assembly {
            // Read EC point (x, y) at (proof_cptr, proof_cptr + 0x20),
            // and check if the point is on affine plane,
            // and store them in (hash_mptr, hash_mptr + 0x20).
            // Return updated (success, proof_cptr, hash_mptr).
            function read_ec_point(success, proof_cptr, hash_mptr, q) -> ret0, ret1, ret2 {
                let x := calldataload(proof_cptr)
                let y := calldataload(add(proof_cptr, 0x20))
                ret0 := and(success, lt(x, q))
                ret0 := and(ret0, lt(y, q))
                ret0 := and(ret0, eq(mulmod(y, y, q), addmod(mulmod(x, mulmod(x, x, q), q), 3, q)))
                mstore(hash_mptr, x)
                mstore(add(hash_mptr, 0x20), y)
                ret1 := add(proof_cptr, 0x40)
                ret2 := add(hash_mptr, 0x40)
            }

            // Squeeze challenge by keccak256(memory[0..hash_mptr]),
            // and store hash mod r as challenge in challenge_mptr,
            // and push back hash in 0x00 as the first input for next squeeze.
            // Return updated (challenge_mptr, hash_mptr).
            function squeeze_challenge(challenge_mptr, hash_mptr, r) -> ret0, ret1 {
                let hash := keccak256(0x00, hash_mptr)
                mstore(challenge_mptr, mod(hash, r))
                mstore(0x00, hash)
                ret0 := add(challenge_mptr, 0x20)
                ret1 := 0x20
            }

            // Squeeze challenge without absorbing new input from calldata,
            // by putting an extra 0x01 in memory[0x20] and squeeze by keccak256(memory[0..21]),
            // and store hash mod r as challenge in challenge_mptr,
            // and push back hash in 0x00 as the first input for next squeeze.
            // Return updated (challenge_mptr).
            function squeeze_challenge_cont(challenge_mptr, r) -> ret {
                mstore8(0x20, 0x01)
                let hash := keccak256(0x00, 0x21)
                mstore(challenge_mptr, mod(hash, r))
                mstore(0x00, hash)
                ret := add(challenge_mptr, 0x20)
            }

            // Batch invert values in memory[mptr_start..mptr_end] in place.
            // Return updated (success).
            function batch_invert(success, mptr_start, mptr_end) -> ret {
                let gp_mptr := mptr_end
                let gp := mload(mptr_start)
                let mptr := add(mptr_start, 0x20)
                for
                    {}
                    lt(mptr, sub(mptr_end, 0x20))
                    {}
                {
                    gp := mulmod(gp, mload(mptr), R)
                    mstore(gp_mptr, gp)
                    mptr := add(mptr, 0x20)
                    gp_mptr := add(gp_mptr, 0x20)
                }
                gp := mulmod(gp, mload(mptr), R)

                mstore(gp_mptr, 0x20)
                mstore(add(gp_mptr, 0x20), 0x20)
                mstore(add(gp_mptr, 0x40), 0x20)
                mstore(add(gp_mptr, 0x60), gp)
                mstore(add(gp_mptr, 0x80), sub(R, 2))
                mstore(add(gp_mptr, 0xa0), R)
                ret := and(success, staticcall(gas(), 0x05, gp_mptr, 0xc0, gp_mptr, 0x20))
                let all_inv := mload(gp_mptr)

                let first_mptr := mptr_start
                let second_mptr := add(first_mptr, 0x20)
                gp_mptr := sub(gp_mptr, 0x20)
                for
                    {}
                    lt(second_mptr, mptr)
                    {}
                {
                    let inv := mulmod(all_inv, mload(gp_mptr), R)
                    all_inv := mulmod(all_inv, mload(mptr), R)
                    mstore(mptr, inv)
                    mptr := sub(mptr, 0x20)
                    gp_mptr := sub(gp_mptr, 0x20)
                }
                let inv_first := mulmod(all_inv, mload(second_mptr), R)
                let inv_second := mulmod(all_inv, mload(first_mptr), R)
                mstore(first_mptr, inv_first)
                mstore(second_mptr, inv_second)
            }

            // Add (x, y) into point at (0x00, 0x20).
            // Return updated (success).
            function ec_add_acc(success, x, y) -> ret {
                mstore(0x40, x)
                mstore(0x60, y)
                ret := and(success, staticcall(gas(), 0x06, 0x00, 0x80, 0x00, 0x40))
            }

            // Scale point at (0x00, 0x20) by scalar.
            function ec_mul_acc(success, scalar) -> ret {
                mstore(0x40, scalar)
                ret := and(success, staticcall(gas(), 0x07, 0x00, 0x60, 0x00, 0x40))
            }

            // Add (x, y) into point at (0x80, 0xa0).
            // Return updated (success).
            function ec_add_tmp(success, x, y) -> ret {
                mstore(0xc0, x)
                mstore(0xe0, y)
                ret := and(success, staticcall(gas(), 0x06, 0x80, 0x80, 0x80, 0x40))
            }

            // Scale point at (0x80, 0xa0) by scalar.
            // Return updated (success).
            function ec_mul_tmp(success, scalar) -> ret {
                mstore(0xc0, scalar)
                ret := and(success, staticcall(gas(), 0x07, 0x80, 0x60, 0x80, 0x40))
            }

            // Perform pairing check.
            // Return updated (success).
            function ec_pairing(success, lhs_x, lhs_y, rhs_x, rhs_y) -> ret {
                mstore(0x00, lhs_x)
                mstore(0x20, lhs_y)
                mstore(0x40, mload(G2_X_1_MPTR))
                mstore(0x60, mload(G2_X_2_MPTR))
                mstore(0x80, mload(G2_Y_1_MPTR))
                mstore(0xa0, mload(G2_Y_2_MPTR))
                mstore(0xc0, rhs_x)
                mstore(0xe0, rhs_y)
                mstore(0x100, mload(NEG_S_G2_X_1_MPTR))
                mstore(0x120, mload(NEG_S_G2_X_2_MPTR))
                mstore(0x140, mload(NEG_S_G2_Y_1_MPTR))
                mstore(0x160, mload(NEG_S_G2_Y_2_MPTR))
                ret := and(success, staticcall(gas(), 0x08, 0x00, 0x180, 0x00, 0x20))
                ret := and(ret, mload(0x00))
            }

            // Modulus
            let q := 21888242871839275222246405745257275088696311157297823662689037894645226208583 // BN254 base field
            let r := 21888242871839275222246405745257275088548364400416034343698204186575808495617 // BN254 scalar field 

            // Initialize success as true
            let success := true

            {
                // Load vk_digest and num_instances of vk into memory
                mstore(0x0960, 0x06a9c39c81c3fa4db17654a01f84914722fded39bf387242827a692e6fca0567) // vk_digest
                mstore(0x0980, 0x0000000000000000000000000000000000000000000000000000000000000002) // num_instances

                // Check valid length of proof
                success := and(success, eq(0x1140, proof.length))

                // Check valid length of instances
                let num_instances := mload(NUM_INSTANCES_MPTR)
                success := and(success, eq(num_instances, instances.length))

                // Absorb vk diegst
                mstore(0x00, mload(VK_DIGEST_MPTR))

                // Read instances and witness commitments and generate challenges
                let hash_mptr := 0x20
                let instance_cptr := instances.offset
                for
                    { let instance_cptr_end := add(instance_cptr, mul(0x20, num_instances)) }
                    lt(instance_cptr, instance_cptr_end)
                    {}
                {
                    let instance := calldataload(instance_cptr)
                    success := and(success, lt(instance, r))
                    mstore(hash_mptr, instance)
                    instance_cptr := add(instance_cptr, 0x20)
                    hash_mptr := add(hash_mptr, 0x20)
                }

                let proof_cptr := proof.offset
                let challenge_mptr := CHALLENGE_MPTR

                // Phase 1
                for
                    { let proof_cptr_end := add(proof_cptr, 0x0240) }
                    lt(proof_cptr, proof_cptr_end)
                    {}
                {
                    success, proof_cptr, hash_mptr := read_ec_point(success, proof_cptr, hash_mptr, q)
                }

                challenge_mptr, hash_mptr := squeeze_challenge(challenge_mptr, hash_mptr, r)

                // Phase 2
                for
                    { let proof_cptr_end := add(proof_cptr, 0x0180) }
                    lt(proof_cptr, proof_cptr_end)
                    {}
                {
                    success, proof_cptr, hash_mptr := read_ec_point(success, proof_cptr, hash_mptr, q)
                }

                challenge_mptr, hash_mptr := squeeze_challenge(challenge_mptr, hash_mptr, r)
                challenge_mptr := squeeze_challenge_cont(challenge_mptr, r)

                // Phase 3
                for
                    { let proof_cptr_end := add(proof_cptr, 0x0280) }
                    lt(proof_cptr, proof_cptr_end)
                    {}
                {
                    success, proof_cptr, hash_mptr := read_ec_point(success, proof_cptr, hash_mptr, q)
                }

                challenge_mptr, hash_mptr := squeeze_challenge(challenge_mptr, hash_mptr, r)

                // Phase 4
                for
                    { let proof_cptr_end := add(proof_cptr, 0x0140) }
                    lt(proof_cptr, proof_cptr_end)
                    {}
                {
                    success, proof_cptr, hash_mptr := read_ec_point(success, proof_cptr, hash_mptr, q)
                }

                challenge_mptr, hash_mptr := squeeze_challenge(challenge_mptr, hash_mptr, r)

                // Read evaluations
                for
                    { let proof_cptr_end := add(proof_cptr, 0x0940) }
                    lt(proof_cptr, proof_cptr_end)
                    {}
                {
                    let eval := calldataload(proof_cptr)
                    success := and(success, lt(eval, r))
                    mstore(hash_mptr, eval)
                    proof_cptr := add(proof_cptr, 0x20)
                    hash_mptr := add(hash_mptr, 0x20)
                }

                // Read batch opening proof and generate challenges
                challenge_mptr, hash_mptr := squeeze_challenge(challenge_mptr, hash_mptr, r)       // zeta
                challenge_mptr := squeeze_challenge_cont(challenge_mptr, r)                        // nu

                success, proof_cptr, hash_mptr := read_ec_point(success, proof_cptr, hash_mptr, q) // W

                challenge_mptr, hash_mptr := squeeze_challenge(challenge_mptr, hash_mptr, r)       // mu

                success, proof_cptr, hash_mptr := read_ec_point(success, proof_cptr, hash_mptr, q) // W'

                // Load full vk into memory
                mstore(0x0960, 0x06a9c39c81c3fa4db17654a01f84914722fded39bf387242827a692e6fca0567) // vk_digest
                mstore(0x0980, 0x0000000000000000000000000000000000000000000000000000000000000002) // num_instances
                mstore(0x09a0, 0x0000000000000000000000000000000000000000000000000000000000000010) // k
                mstore(0x09c0, 0x30641e0e92bebef818268d663bcad6dbcfd6c0149170f6d7d350b1b1fa6c1001) // n_inv
                mstore(0x09e0, 0x09d2cc4b5782fbe923e49ace3f647643a5f5d8fb89091c3ababd582133584b29) // omega
                mstore(0x0a00, 0x0cf312e84f2456134e812826473d3dfb577b2bfdba762aba88b47b740472c1f0) // omega_inv
                mstore(0x0a20, 0x17cbd779ed6ea1b8e9dbcde0345b2cfdb96e80bea0dd1318bdd0e183a00e0492) // omega_inv_to_l
                mstore(0x0a40, 0x0000000000000000000000000000000000000000000000000000000000000000) // has_accumulator
                mstore(0x0a60, 0x0000000000000000000000000000000000000000000000000000000000000000) // acc_offset
                mstore(0x0a80, 0x0000000000000000000000000000000000000000000000000000000000000000) // num_acc_limbs
                mstore(0x0aa0, 0x0000000000000000000000000000000000000000000000000000000000000000) // num_acc_limb_bits
                mstore(0x0ac0, 0x0000000000000000000000000000000000000000000000000000000000000001) // g1_x
                mstore(0x0ae0, 0x0000000000000000000000000000000000000000000000000000000000000002) // g1_y
                mstore(0x0b00, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2) // g2_x_1
                mstore(0x0b20, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed) // g2_x_2
                mstore(0x0b40, 0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b) // g2_y_1
                mstore(0x0b60, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa) // g2_y_2
                mstore(0x0b80, 0x186282957db913abd99f91db59fe69922e95040603ef44c0bd7aa3adeef8f5ac) // neg_s_g2_x_1
                mstore(0x0ba0, 0x17944351223333f260ddc3b4af45191b856689eda9eab5cbcddbbe570ce860d2) // neg_s_g2_x_2
                mstore(0x0bc0, 0x06d971ff4a7467c3ec596ed6efc674572e32fd6f52b721f97e35b0b3d3546753) // neg_s_g2_y_1
                mstore(0x0be0, 0x06ecdb9f9567f59ed2eee36e1e1d58797fd13cc97fafc2910f5e8a12f202fa9a) // neg_s_g2_y_2
                mstore(0x0c00, 0x02abfa7f17e2b4bb2b82da2626da1e02e2bbf0f9dc8d6d23ecef30a3d3383e34) // fixed_comms[0].x
                mstore(0x0c20, 0x2c6adf719a077e0972637e3d3ecf85a6349c6d04e9252cc705b8e2468845b7af) // fixed_comms[0].y
                mstore(0x0c40, 0x1f6a6dd10ef7cf05619b67e9770de891c1206e65b2c9ead6c2b74c1be7a12abf) // fixed_comms[1].x
                mstore(0x0c60, 0x187cd819404c65d0a5e039c1afb06e255a4725aac26a2c891eb2e7626e4a7b7b) // fixed_comms[1].y
                mstore(0x0c80, 0x1766729615a9194f3f7d14cdc7014d23a7ee845290d59c17713b37aa565f4c99) // fixed_comms[2].x
                mstore(0x0ca0, 0x14f5ef91f1088507f27acc09bd00f8665414ae53b7bea237d299e0a68ea4996f) // fixed_comms[2].y
                mstore(0x0cc0, 0x1041c70f021fc86af87ae40a70056d52bec4a2570e274bae37e82d86dc07fca6) // fixed_comms[3].x
                mstore(0x0ce0, 0x2b5b13385c15783f40253e4affa2325070aa6935a7311b7e48ee384e1222a372) // fixed_comms[3].y
                mstore(0x0d00, 0x1ac492285a5b46167a3578f80e9ed366718a97cbab8a49a6906d3ced4bc221cf) // fixed_comms[4].x
                mstore(0x0d20, 0x2254ad26f560287ba160b68ed49bc34e38bf7aa423c49ef6906834bb863c2c6a) // fixed_comms[4].y
                mstore(0x0d40, 0x120fb69ceb24d15de0de4038c28df1d3802cb1163765c41f31b106e67f7ba3d0) // fixed_comms[5].x
                mstore(0x0d60, 0x06dcd898d3f5a5bfcd9e1c1e3ba021a58e3bdb184a58b7fe958da7aa44d75177) // fixed_comms[5].y
                mstore(0x0d80, 0x02086e51c7d4f111974ab401919f6bc937de6745dddcee8b622407de6cc4d76e) // fixed_comms[6].x
                mstore(0x0da0, 0x219b369bd0a20bd5d70cae608366bfb486be82e02c3e1b336443b7bbae0ff63d) // fixed_comms[6].y
                mstore(0x0dc0, 0x0dbae6d5df1891a57d646ab2c79653c7b1c0274127be23afbf7f0b653b8495d8) // fixed_comms[7].x
                mstore(0x0de0, 0x0647bb7689eac2e471002797bcd99b454f0699a77c51d60796e283af7e431310) // fixed_comms[7].y
                mstore(0x0e00, 0x2f267281e14a4ae7a64b3ec823db833b830e658dc7a1980dcb573096866415a1) // fixed_comms[8].x
                mstore(0x0e20, 0x041955dd85a674b06fbcfcb6df6722bee5f2dd160934002eb21680f3bbedac08) // fixed_comms[8].y
                mstore(0x0e40, 0x0000000000000000000000000000000000000000000000000000000000000000) // fixed_comms[9].x
                mstore(0x0e60, 0x0000000000000000000000000000000000000000000000000000000000000000) // fixed_comms[9].y
                mstore(0x0e80, 0x00d8000d71840d80875ee905f0dc00f1d9ae75e2c19a60c616173bf7a05a1ceb) // fixed_comms[10].x
                mstore(0x0ea0, 0x0055b0d0f356bad36eb404ca0ad995fc51bb7c84128e162e2eaa11fb54567388) // fixed_comms[10].y
                mstore(0x0ec0, 0x1ee348f47a77814633e993ea284ca2c46fd741e8175eaac29cb0836acc79b91d) // fixed_comms[11].x
                mstore(0x0ee0, 0x104ef4aa6ce114d5bd421bffceec63ded0008da68e787ce50979c315ef87356d) // fixed_comms[11].y
                mstore(0x0f00, 0x2da9aaabf06cda114c25eef21dd224a68980f55af612090c989369c6912f9d2c) // fixed_comms[12].x
                mstore(0x0f20, 0x1317d092068fb5801f3401860f8dfa5fcd3c597cc615e8ca8afbbd11927dc885) // fixed_comms[12].y
                mstore(0x0f40, 0x098b47bac26225cdb61e4d5bad24cef18c3088bccaf42ea44db8be6f4cf54555) // fixed_comms[13].x
                mstore(0x0f60, 0x1742cac3d983bf3570790edc349b12bdee4e6a96f6171ad0285842525fb5186b) // fixed_comms[13].y
                mstore(0x0f80, 0x098b47bac26225cdb61e4d5bad24cef18c3088bccaf42ea44db8be6f4cf54555) // fixed_comms[14].x
                mstore(0x0fa0, 0x1742cac3d983bf3570790edc349b12bdee4e6a96f6171ad0285842525fb5186b) // fixed_comms[14].y
                mstore(0x0fc0, 0x07b158a58f437dc8432e6ffcb924365e7258b4c866488dda0a4030b91eeed8bf) // fixed_comms[15].x
                mstore(0x0fe0, 0x2b6c896879e9e8ad63fdbeda5f180f64b882dcb032647c2865249ef17aa7b7bb) // fixed_comms[15].y
                mstore(0x1000, 0x18cc4bc45d78a8c3f03d6b1d8ed6af761382f65ed0d5e05a68f6bf1b8796be16) // fixed_comms[16].x
                mstore(0x1020, 0x245537a8db3e72e60862fa3b91f74878e46b7bd3271bdbadd92535ffcceacbc5) // fixed_comms[16].y
                mstore(0x1040, 0x2a612f53d96d9195dc9b2d8dcedf1095ae82afda68c46b02ad4f0c3d7faca085) // fixed_comms[17].x
                mstore(0x1060, 0x0765a9b6a6cf703ce2dd85ef07c52937dfe43cbffa912e7ddb6bea7b919c90a7) // fixed_comms[17].y
                mstore(0x1080, 0x0d4120f155d7eda3525c6e561037ea0a6754e0d7f5c63793b0f5fb093fe4fbe6) // fixed_comms[18].x
                mstore(0x10a0, 0x1e5f60b0ee162641ca03fde7cfdd416a278bb356ca60aa6633932d237c69b79b) // fixed_comms[18].y
                mstore(0x10c0, 0x1e8f9da59b37e1a8c26058dcc49b2ad08f90a2bb18a1b7f269099fdef7a1d3f9) // fixed_comms[19].x
                mstore(0x10e0, 0x05036531f621a410e7a131cf724b1bc70cc64f7911f9a5dd8e8a4e0c14806ae3) // fixed_comms[19].y
                mstore(0x1100, 0x0000000000000000000000000000000000000000000000000000000000000000) // fixed_comms[20].x
                mstore(0x1120, 0x0000000000000000000000000000000000000000000000000000000000000000) // fixed_comms[20].y
                mstore(0x1140, 0x15b5f37004c355a6f988262f7354af00ab6305970eadb0e69bb1a73f065c5997) // permutation_comms[0].x
                mstore(0x1160, 0x15e352f1734582317508d2a9367c18ec007dc65fd92b238203defcf5ea720de8) // permutation_comms[0].y
                mstore(0x1180, 0x1a9f8c6524624f3b46f7c7c99bad8b0b9d61a425aff4cb5f7729a398fd664a6c) // permutation_comms[1].x
                mstore(0x11a0, 0x023ada65ab2d1519111fd6c03dc252e62f26f6175570d39bad5bebf42830a44e) // permutation_comms[1].y
                mstore(0x11c0, 0x2a567aab0f2879ead56081effad67a0a92978e96c437d2e048ac195176fa89d9) // permutation_comms[2].x
                mstore(0x11e0, 0x1aeb859d7c46d1437f3ab3dfd7c61823f2ce18a15127f86e71ef859acf4999db) // permutation_comms[2].y
                mstore(0x1200, 0x13f9d3bc835038c769cb2045f378745c0577da9e0d5bed4782efa9c25fb0c7ea) // permutation_comms[3].x
                mstore(0x1220, 0x167cf2a960b4472d8783d2079e3ff5226b0f2869211df67819d4e4ce908da0e6) // permutation_comms[3].y
                mstore(0x1240, 0x27e145342a08212e7130c35f46f1ff8e94572d85fda8fa8c56cd051b480d8f8b) // permutation_comms[4].x
                mstore(0x1260, 0x1d115dac3a067a8a96edc91193e2713eaaf867a0831c40378e7c02b396905d17) // permutation_comms[4].y
                mstore(0x1280, 0x1c685b8138979afa1e91fc2a443d45cae88062996162180d8ba574b1555b7971) // permutation_comms[5].x
                mstore(0x12a0, 0x2c81f8abcc903267d5c73f7cc4e220358bb05b19986dcc22458c90e462f0ae46) // permutation_comms[5].y
                mstore(0x12c0, 0x0f984054d3cef5ce17763269121242c7c2d434ebcd809c5bdea23997add59bd9) // permutation_comms[6].x
                mstore(0x12e0, 0x0bf06d8f64a2a133c7d25907cc3b16822d660205aba32e41aea070b1688376ca) // permutation_comms[6].y
                mstore(0x1300, 0x2b5082ed867af7c826f857cd6c98383a019f74863344e8c70363048bc28f98f4) // permutation_comms[7].x
                mstore(0x1320, 0x2f9d290f5b396cdd057790f0d4234f3005852ff1346ceb9d1530012a9a3d04f9) // permutation_comms[7].y
                mstore(0x1340, 0x02e2678e0a2dae806fbb194a045a92900c791e935b4898c593d0e6f06b6c0efe) // permutation_comms[8].x
                mstore(0x1360, 0x1a66e5d65cda93b64729fca6cbbb4ded186c35aa263ac64ae6b7cd778b54d9d2) // permutation_comms[8].y
                mstore(0x1380, 0x0e0127f2a80984410031efe8d3a97441e66c6cecdd0ece5dfabecb1909ed7644) // permutation_comms[9].x
                mstore(0x13a0, 0x10cd8501260da6a954bf9f7053b1b70a25319e5634ebc266cc57b696332e2216) // permutation_comms[9].y
                mstore(0x13c0, 0x1cc46994bec4b6d5d7644efc7a1f01e03ae3b0443e6dcfe1cb803ab04d43780d) // permutation_comms[10].x
                mstore(0x13e0, 0x2de6495c016a72c0e6677fb7c9ccf16e037699ce2508c833e54e2e55da015ef7) // permutation_comms[10].y
                mstore(0x1400, 0x2672fe2fb229e1428e2b5c03ba0745559c4d37dc4cd6f768961ac36fc94cc075) // permutation_comms[11].x
                mstore(0x1420, 0x134a8d16b50dc91421b215c781422cda49ef84b287f0e2deaf8ded1cb621194c) // permutation_comms[11].y

                // Read accumulator from instances
                if mload(HAS_ACCUMULATOR_MPTR) {
                    let num_limbs := mload(NUM_ACC_LIMBS_MPTR)
                    let num_limb_bits := mload(NUM_ACC_LIMB_BITS_MPTR)

                    let cptr := add(instances.offset, mul(mload(ACC_OFFSET_MPTR), 0x20))
                    let lhs_y_off := mul(num_limbs, 0x20)
                    let rhs_x_off := mul(lhs_y_off, 2)
                    let rhs_y_off := mul(lhs_y_off, 3)
                    let lhs_x := calldataload(cptr)
                    let lhs_y := calldataload(add(cptr, lhs_y_off))
                    let rhs_x := calldataload(add(cptr, rhs_x_off))
                    let rhs_y := calldataload(add(cptr, rhs_y_off))
                    for
                        {
                            let cptr_end := add(cptr, mul(0x20, num_limbs))
                            let shift := num_limb_bits
                        }
                        lt(cptr, cptr_end)
                        {}
                    {
                        cptr := add(cptr, 0x20)
                        lhs_x := add(lhs_x, shl(shift, calldataload(cptr)))
                        lhs_y := add(lhs_y, shl(shift, calldataload(add(cptr, lhs_y_off))))
                        rhs_x := add(rhs_x, shl(shift, calldataload(add(cptr, rhs_x_off))))
                        rhs_y := add(rhs_y, shl(shift, calldataload(add(cptr, rhs_y_off))))
                        shift := add(shift, num_limb_bits)
                    }

                    success := and(success, eq(mulmod(lhs_y, lhs_y, q), addmod(mulmod(lhs_x, mulmod(lhs_x, lhs_x, q), q), 3, q)))
                    success := and(success, eq(mulmod(rhs_y, rhs_y, q), addmod(mulmod(rhs_x, mulmod(rhs_x, rhs_x, q), q), 3, q)))

                    mstore(ACC_LHS_X_MPTR, lhs_x)
                    mstore(ACC_LHS_Y_MPTR, lhs_y)
                    mstore(ACC_RHS_X_MPTR, rhs_x)
                    mstore(ACC_RHS_Y_MPTR, rhs_y)
                }

                pop(q)
            }

            // Revert earlier if anything from calldata is invalid
            if iszero(success) {
                revert(0, 0)
            }

            // Compute lagrange evaluations and instance evaluation
            {
                let k := mload(K_MPTR)
                let x := mload(X_MPTR)
                let x_n := x
                for
                    { let idx := 0 }
                    lt(idx, k)
                    { idx := add(idx, 1) }
                {
                    x_n := mulmod(x_n, x_n, r)
                }

                let omega := mload(OMEGA_MPTR)

                let mptr := X_N_MPTR
                let mptr_end := add(mptr, mul(0x20, add(mload(NUM_INSTANCES_MPTR), 6)))
                if iszero(mload(NUM_INSTANCES_MPTR)) {
                    mptr_end := add(mptr_end, 0x20)
                }
                for
                    { let pow_of_omega := mload(OMEGA_INV_TO_L_MPTR) }
                    lt(mptr, mptr_end)
                    { mptr := add(mptr, 0x20) }
                {
                    mstore(mptr, addmod(x, sub(r, pow_of_omega), r))
                    pow_of_omega := mulmod(pow_of_omega, omega, r)
                }
                let x_n_minus_1 := addmod(x_n, sub(r, 1), r)
                mstore(mptr_end, x_n_minus_1)
                success := batch_invert(success, X_N_MPTR, add(mptr_end, 0x20))

                mptr := X_N_MPTR
                let l_i_common := mulmod(x_n_minus_1, mload(N_INV_MPTR), r)
                for
                    { let pow_of_omega := mload(OMEGA_INV_TO_L_MPTR) }
                    lt(mptr, mptr_end)
                    { mptr := add(mptr, 0x20) }
                {
                    mstore(mptr, mulmod(l_i_common, mulmod(mload(mptr), pow_of_omega, r), r))
                    pow_of_omega := mulmod(pow_of_omega, omega, r)
                }

                let l_blind := mload(add(X_N_MPTR, 0x20))
                let l_i_cptr := add(X_N_MPTR, 0x40)
                for
                    { let l_i_cptr_end := add(X_N_MPTR, 0xc0) }
                    lt(l_i_cptr, l_i_cptr_end)
                    { l_i_cptr := add(l_i_cptr, 0x20) }
                {
                    l_blind := addmod(l_blind, mload(l_i_cptr), r)
                }

                let instance_eval := 0
                for
                    {
                        let instance_cptr := instances.offset
                        let instance_cptr_end := add(instance_cptr, mul(0x20, mload(NUM_INSTANCES_MPTR)))
                    }
                    lt(instance_cptr, instance_cptr_end)
                    {
                        instance_cptr := add(instance_cptr, 0x20)
                        l_i_cptr := add(l_i_cptr, 0x20)
                    }
                {
                    instance_eval := addmod(instance_eval, mulmod(mload(l_i_cptr), calldataload(instance_cptr), r), r)
                }

                let x_n_minus_1_inv := mload(mptr_end)
                let l_last := mload(X_N_MPTR)
                let l_0 := mload(add(X_N_MPTR, 0xc0))

                mstore(X_N_MPTR, x_n)
                mstore(X_N_MINUS_1_INV_MPTR, x_n_minus_1_inv)
                mstore(L_LAST_MPTR, l_last)
                mstore(L_BLIND_MPTR, l_blind)
                mstore(L_0_MPTR, l_0)
                mstore(INSTANCE_EVAL_MPTR, instance_eval)
            }

            // Compute quotient evavluation
            {
                let quotient_eval_numer
                let y := mload(Y_MPTR)
                {
                    let f_15 := calldataload(0x0b84)
                    let a_6 := calldataload(0x08a4)
                    let f_1 := calldataload(0x0a04)
                    let var0 := addmod(a_6, f_1, R)
                    let var1 := mulmod(var0, var0, R)
                    let var2 := mulmod(var1, var1, R)
                    let var3 := mulmod(var2, var0, R)
                    let var4 := mulmod(var3, 0x66f6f85d6f68a85ec10345351a23a3aaf07f38af8c952a7bceca70bd2af7ad5, R)
                    let a_7 := calldataload(0x08c4)
                    let f_2 := calldataload(0x0a24)
                    let var5 := addmod(a_7, f_2, R)
                    let var6 := mulmod(var5, var5, R)
                    let var7 := mulmod(var6, var6, R)
                    let var8 := mulmod(var7, var5, R)
                    let var9 := mulmod(var8, 0x2b9d4b4110c9ae997782e1509b1d0fdb20a7c02bbd8bea7305462b9f8125b1e8, R)
                    let var10 := addmod(var4, var9, R)
                    let a_6_next_1 := calldataload(0x08e4)
                    let var11 := sub(R, a_6_next_1)
                    let var12 := addmod(var10, var11, R)
                    let var13 := mulmod(f_15, var12, R)
                    quotient_eval_numer := var13
                }
                {
                    let f_15 := calldataload(0x0b84)
                    let a_6 := calldataload(0x08a4)
                    let f_1 := calldataload(0x0a04)
                    let var0 := addmod(a_6, f_1, R)
                    let var1 := mulmod(var0, var0, R)
                    let var2 := mulmod(var1, var1, R)
                    let var3 := mulmod(var2, var0, R)
                    let var4 := mulmod(var3, 0xcc57cdbb08507d62bf67a4493cc262fb6c09d557013fff1f573f431221f8ff9, R)
                    let a_7 := calldataload(0x08c4)
                    let f_2 := calldataload(0x0a24)
                    let var5 := addmod(a_7, f_2, R)
                    let var6 := mulmod(var5, var5, R)
                    let var7 := mulmod(var6, var6, R)
                    let var8 := mulmod(var7, var5, R)
                    let var9 := mulmod(var8, 0x1274e649a32ed355a31a6ed69724e1adade857e86eb5c3a121bcd147943203c8, R)
                    let var10 := addmod(var4, var9, R)
                    let a_7_next_1 := calldataload(0x0904)
                    let var11 := sub(R, a_7_next_1)
                    let var12 := addmod(var10, var11, R)
                    let var13 := mulmod(f_15, var12, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var13, r)
                }
                {
                    let f_16 := calldataload(0x0ba4)
                    let a_6 := calldataload(0x08a4)
                    let f_1 := calldataload(0x0a04)
                    let var0 := addmod(a_6, f_1, R)
                    let var1 := mulmod(var0, var0, R)
                    let var2 := mulmod(var1, var1, R)
                    let var3 := mulmod(var2, var0, R)
                    let a_8 := calldataload(0x0924)
                    let var4 := sub(R, a_8)
                    let var5 := addmod(var3, var4, R)
                    let var6 := mulmod(f_16, var5, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var6, r)
                }
                {
                    let f_16 := calldataload(0x0ba4)
                    let a_8 := calldataload(0x0924)
                    let var0 := mulmod(a_8, 0x66f6f85d6f68a85ec10345351a23a3aaf07f38af8c952a7bceca70bd2af7ad5, R)
                    let a_7 := calldataload(0x08c4)
                    let f_2 := calldataload(0x0a24)
                    let var1 := addmod(a_7, f_2, R)
                    let var2 := mulmod(var1, 0x2b9d4b4110c9ae997782e1509b1d0fdb20a7c02bbd8bea7305462b9f8125b1e8, R)
                    let var3 := addmod(var0, var2, R)
                    let f_3 := calldataload(0x09c4)
                    let var4 := addmod(var3, f_3, R)
                    let var5 := mulmod(var4, var4, R)
                    let var6 := mulmod(var5, var5, R)
                    let var7 := mulmod(var6, var4, R)
                    let a_6_next_1 := calldataload(0x08e4)
                    let var8 := mulmod(a_6_next_1, 0x13abec390ada7f4370819ab1c7846f210554569d9b29d1ea8dbebd0fa8c53e66, R)
                    let a_7_next_1 := calldataload(0x0904)
                    let var9 := mulmod(a_7_next_1, 0x1eb9e1dc19a33a624c9862a1d97d1510bd521ead5dfe0345aaf6185b1a1e60fe, R)
                    let var10 := addmod(var8, var9, R)
                    let var11 := sub(R, var10)
                    let var12 := addmod(var7, var11, R)
                    let var13 := mulmod(f_16, var12, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var13, r)
                }
                {
                    let f_16 := calldataload(0x0ba4)
                    let a_8 := calldataload(0x0924)
                    let var0 := mulmod(a_8, 0xcc57cdbb08507d62bf67a4493cc262fb6c09d557013fff1f573f431221f8ff9, R)
                    let a_7 := calldataload(0x08c4)
                    let f_2 := calldataload(0x0a24)
                    let var1 := addmod(a_7, f_2, R)
                    let var2 := mulmod(var1, 0x1274e649a32ed355a31a6ed69724e1adade857e86eb5c3a121bcd147943203c8, R)
                    let var3 := addmod(var0, var2, R)
                    let f_4 := calldataload(0x09e4)
                    let var4 := addmod(var3, f_4, R)
                    let a_6_next_1 := calldataload(0x08e4)
                    let var5 := mulmod(a_6_next_1, 0xfc1c9394db89bb2601abc49fdad4f038ce5169030a2ad69763f7875036bcb02, R)
                    let a_7_next_1 := calldataload(0x0904)
                    let var6 := mulmod(a_7_next_1, 0x16a9e98c493a902b9502054edc03e7b22b7eac34345961bc8abced6bd147c8be, R)
                    let var7 := addmod(var5, var6, R)
                    let var8 := sub(R, var7)
                    let var9 := addmod(var4, var8, R)
                    let var10 := mulmod(f_16, var9, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var10, r)
                }
                {
                    let f_17 := calldataload(0x0bc4)
                    let var0 := 0x2
                    let var1 := sub(R, f_17)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_17, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_6_prev_1 := calldataload(0x0964)
                    let a_6 := calldataload(0x08a4)
                    let var10 := addmod(a_6_prev_1, a_6, R)
                    let a_6_next_1 := calldataload(0x08e4)
                    let var11 := sub(R, a_6_next_1)
                    let var12 := addmod(var10, var11, R)
                    let var13 := mulmod(var9, var12, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var13, r)
                }
                {
                    let f_17 := calldataload(0x0bc4)
                    let var0 := 0x2
                    let var1 := sub(R, f_17)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_17, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_7_prev_1 := calldataload(0x0944)
                    let a_7_next_1 := calldataload(0x0904)
                    let var10 := sub(R, a_7_next_1)
                    let var11 := addmod(a_7_prev_1, var10, R)
                    let var12 := mulmod(var9, var11, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var12, r)
                }
                {
                    let f_17 := calldataload(0x0bc4)
                    let var0 := 0x1
                    let var1 := sub(R, f_17)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_17, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_4 := calldataload(0x0864)
                    let a_0 := calldataload(0x07e4)
                    let a_2 := calldataload(0x0824)
                    let var10 := addmod(a_0, a_2, R)
                    let var11 := sub(R, var10)
                    let var12 := addmod(a_4, var11, R)
                    let var13 := mulmod(var9, var12, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var13, r)
                }
                {
                    let f_18 := calldataload(0x0be4)
                    let var0 := 0x1
                    let var1 := sub(R, f_18)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_18, var2, R)
                    let var4 := 0x2
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_5 := calldataload(0x0884)
                    let a_1 := calldataload(0x0804)
                    let a_3 := calldataload(0x0844)
                    let var10 := addmod(a_1, a_3, R)
                    let var11 := sub(R, var10)
                    let var12 := addmod(a_5, var11, R)
                    let var13 := mulmod(var9, var12, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var13, r)
                }
                {
                    let f_18 := calldataload(0x0be4)
                    let var0 := 0x1
                    let var1 := sub(R, f_18)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_18, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_4 := calldataload(0x0864)
                    let a_0 := calldataload(0x07e4)
                    let a_2 := calldataload(0x0824)
                    let var10 := mulmod(a_0, a_2, R)
                    let var11 := sub(R, var10)
                    let var12 := addmod(a_4, var11, R)
                    let var13 := mulmod(var9, var12, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var13, r)
                }
                {
                    let f_19 := calldataload(0x0c04)
                    let var0 := 0x1
                    let var1 := sub(R, f_19)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_19, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let a_5 := calldataload(0x0884)
                    let a_1 := calldataload(0x0804)
                    let a_3 := calldataload(0x0844)
                    let var7 := mulmod(a_1, a_3, R)
                    let var8 := sub(R, var7)
                    let var9 := addmod(a_5, var8, R)
                    let var10 := mulmod(var6, var9, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var10, r)
                }
                {
                    let f_18 := calldataload(0x0be4)
                    let var0 := 0x2
                    let var1 := sub(R, f_18)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_18, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_4 := calldataload(0x0864)
                    let a_0 := calldataload(0x07e4)
                    let a_2 := calldataload(0x0824)
                    let var10 := sub(R, a_2)
                    let var11 := addmod(a_0, var10, R)
                    let var12 := sub(R, var11)
                    let var13 := addmod(a_4, var12, R)
                    let var14 := mulmod(var9, var13, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var14, r)
                }
                {
                    let f_19 := calldataload(0x0c04)
                    let var0 := 0x2
                    let var1 := sub(R, f_19)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_19, var2, R)
                    let var4 := 0x3
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let a_5 := calldataload(0x0884)
                    let a_1 := calldataload(0x0804)
                    let a_3 := calldataload(0x0844)
                    let var7 := sub(R, a_3)
                    let var8 := addmod(a_1, var7, R)
                    let var9 := sub(R, var8)
                    let var10 := addmod(a_5, var9, R)
                    let var11 := mulmod(var6, var10, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var11, r)
                }
                {
                    let f_18 := calldataload(0x0be4)
                    let var0 := 0x1
                    let var1 := sub(R, f_18)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_18, var2, R)
                    let var4 := 0x2
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x3
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_4 := calldataload(0x0864)
                    let a_4_prev_1 := calldataload(0x0984)
                    let var10 := 0x0
                    let a_0 := calldataload(0x07e4)
                    let a_2 := calldataload(0x0824)
                    let var11 := mulmod(a_0, a_2, R)
                    let var12 := addmod(var10, var11, R)
                    let a_1 := calldataload(0x0804)
                    let a_3 := calldataload(0x0844)
                    let var13 := mulmod(a_1, a_3, R)
                    let var14 := addmod(var12, var13, R)
                    let var15 := addmod(a_4_prev_1, var14, R)
                    let var16 := sub(R, var15)
                    let var17 := addmod(a_4, var16, R)
                    let var18 := mulmod(var9, var17, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var18, r)
                }
                {
                    let f_17 := calldataload(0x0bc4)
                    let var0 := 0x1
                    let var1 := sub(R, f_17)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_17, var2, R)
                    let var4 := 0x2
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x4
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_4 := calldataload(0x0864)
                    let var10 := 0x0
                    let a_0 := calldataload(0x07e4)
                    let a_2 := calldataload(0x0824)
                    let var11 := mulmod(a_0, a_2, R)
                    let var12 := addmod(var10, var11, R)
                    let a_1 := calldataload(0x0804)
                    let a_3 := calldataload(0x0844)
                    let var13 := mulmod(a_1, a_3, R)
                    let var14 := addmod(var12, var13, R)
                    let var15 := sub(R, var14)
                    let var16 := addmod(a_4, var15, R)
                    let var17 := mulmod(var9, var16, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var17, r)
                }
                {
                    let f_17 := calldataload(0x0bc4)
                    let var0 := 0x1
                    let var1 := sub(R, f_17)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_17, var2, R)
                    let var4 := 0x2
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let var7 := 0x3
                    let var8 := addmod(var7, var1, R)
                    let var9 := mulmod(var6, var8, R)
                    let a_4 := calldataload(0x0864)
                    let a_2 := calldataload(0x0824)
                    let var10 := mulmod(var0, a_2, R)
                    let a_3 := calldataload(0x0844)
                    let var11 := mulmod(var10, a_3, R)
                    let var12 := sub(R, var11)
                    let var13 := addmod(a_4, var12, R)
                    let var14 := mulmod(var9, var13, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var14, r)
                }
                {
                    let f_19 := calldataload(0x0c04)
                    let var0 := 0x1
                    let var1 := sub(R, f_19)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_19, var2, R)
                    let var4 := 0x2
                    let var5 := addmod(var4, var1, R)
                    let var6 := mulmod(var3, var5, R)
                    let a_4 := calldataload(0x0864)
                    let a_4_prev_1 := calldataload(0x0984)
                    let a_2 := calldataload(0x0824)
                    let var7 := mulmod(var0, a_2, R)
                    let a_3 := calldataload(0x0844)
                    let var8 := mulmod(var7, a_3, R)
                    let var9 := mulmod(a_4_prev_1, var8, R)
                    let var10 := sub(R, var9)
                    let var11 := addmod(a_4, var10, R)
                    let var12 := mulmod(var6, var11, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var12, r)
                }
                {
                    let f_20 := calldataload(0x0c24)
                    let var0 := 0x1
                    let var1 := sub(R, f_20)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_20, var2, R)
                    let a_4 := calldataload(0x0864)
                    let var4 := 0x0
                    let a_2 := calldataload(0x0824)
                    let var5 := addmod(var4, a_2, R)
                    let a_3 := calldataload(0x0844)
                    let var6 := addmod(var5, a_3, R)
                    let var7 := sub(R, var6)
                    let var8 := addmod(a_4, var7, R)
                    let var9 := mulmod(var3, var8, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var9, r)
                }
                {
                    let f_20 := calldataload(0x0c24)
                    let var0 := 0x2
                    let var1 := sub(R, f_20)
                    let var2 := addmod(var0, var1, R)
                    let var3 := mulmod(f_20, var2, R)
                    let a_4 := calldataload(0x0864)
                    let a_4_prev_1 := calldataload(0x0984)
                    let var4 := 0x0
                    let a_2 := calldataload(0x0824)
                    let var5 := addmod(var4, a_2, R)
                    let a_3 := calldataload(0x0844)
                    let var6 := addmod(var5, a_3, R)
                    let var7 := addmod(a_4_prev_1, var6, R)
                    let var8 := sub(R, var7)
                    let var9 := addmod(a_4, var8, R)
                    let var10 := mulmod(var3, var9, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var10, r)
                }
                {
                    let f_9 := calldataload(0x0ac4)
                    let var0 := 0x0
                    let var1 := mulmod(f_9, var0, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var1, r)
                }
                {
                    let f_10 := calldataload(0x0ae4)
                    let var0 := 0x0
                    let var1 := mulmod(f_10, var0, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var1, r)
                }
                {
                    let f_11 := calldataload(0x0b04)
                    let var0 := 0x0
                    let var1 := mulmod(f_11, var0, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var1, r)
                }
                {
                    let f_12 := calldataload(0x0b24)
                    let var0 := 0x0
                    let var1 := mulmod(f_12, var0, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var1, r)
                }
                {
                    let f_13 := calldataload(0x0b44)
                    let var0 := 0x0
                    let var1 := mulmod(f_13, var0, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var1, r)
                }
                {
                    let f_14 := calldataload(0x0b64)
                    let var0 := 0x0
                    let var1 := mulmod(f_14, var0, R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), var1, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := addmod(l_0, sub(R, mulmod(l_0, calldataload(0x0de4), R)), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let perm_z_last := calldataload(0x0ea4)
                    let eval := mulmod(mload(L_LAST_MPTR), addmod(mulmod(perm_z_last, perm_z_last, R), sub(R, perm_z_last), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let eval := mulmod(mload(L_0_MPTR), addmod(calldataload(0x0e44), sub(R, calldataload(0x0e24)), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let eval := mulmod(mload(L_0_MPTR), addmod(calldataload(0x0ea4), sub(R, calldataload(0x0e84)), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let gamma := mload(GAMMA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let lhs := calldataload(0x0e04)
                    let rhs := calldataload(0x0de4)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x07e4), mulmod(beta, calldataload(0x0c64), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x0804), mulmod(beta, calldataload(0x0c84), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x0824), mulmod(beta, calldataload(0x0ca4), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x0844), mulmod(beta, calldataload(0x0cc4), R), R), gamma, R), R)
                    mstore(0x00, mulmod(beta, mload(X_MPTR), R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x07e4), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x0804), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x0824), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x0844), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    let left_sub_right := addmod(lhs, sub(R, rhs), R)
                    let eval := addmod(left_sub_right, sub(R, mulmod(left_sub_right, addmod(mload(L_LAST_MPTR), mload(L_BLIND_MPTR), R), R)), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let gamma := mload(GAMMA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let lhs := calldataload(0x0e64)
                    let rhs := calldataload(0x0e44)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x0864), mulmod(beta, calldataload(0x0ce4), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x0884), mulmod(beta, calldataload(0x0d04), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x09a4), mulmod(beta, calldataload(0x0d24), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x08a4), mulmod(beta, calldataload(0x0d44), R), R), gamma, R), R)
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x0864), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x0884), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x09a4), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x08a4), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    let left_sub_right := addmod(lhs, sub(R, rhs), R)
                    let eval := addmod(left_sub_right, sub(R, mulmod(left_sub_right, addmod(mload(L_LAST_MPTR), mload(L_BLIND_MPTR), R), R)), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let gamma := mload(GAMMA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let lhs := calldataload(0x0ec4)
                    let rhs := calldataload(0x0ea4)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x08c4), mulmod(beta, calldataload(0x0d64), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x09c4), mulmod(beta, calldataload(0x0d84), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(mload(INSTANCE_EVAL_MPTR), mulmod(beta, calldataload(0x0da4), R), R), gamma, R), R)
                    lhs := mulmod(lhs, addmod(addmod(calldataload(0x09e4), mulmod(beta, calldataload(0x0dc4), R), R), gamma, R), R)
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x08c4), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x09c4), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(mload(INSTANCE_EVAL_MPTR), mload(0x00), R), gamma, R), R)
                    mstore(0x00, mulmod(mload(0x00), DELTA, R))
                    rhs := mulmod(rhs, addmod(addmod(calldataload(0x09e4), mload(0x00), R), gamma, R), R)
                    let left_sub_right := addmod(lhs, sub(R, rhs), R)
                    let eval := addmod(left_sub_right, sub(R, mulmod(left_sub_right, addmod(mload(L_LAST_MPTR), mload(L_BLIND_MPTR), R), R)), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := mulmod(l_0, calldataload(0x0ee4), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_last := mload(L_LAST_MPTR)
                    let eval := mulmod(l_last, calldataload(0x0ee4), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let theta := mload(THETA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let table
                    {
                        let f_5 := calldataload(0x0a44)
                        let f_6 := calldataload(0x0a64)
                        table := f_5
                        table := addmod(mulmod(table, theta, R), f_6, R)
                        table := addmod(table, beta, R)
                    }
                    let input_0
                    {
                        let f_9 := calldataload(0x0ac4)
                        let var0 := 0x1
                        let var1 := mulmod(f_9, var0, R)
                        let a_0 := calldataload(0x07e4)
                        let var2 := mulmod(var1, a_0, R)
                        let var3 := sub(R, var1)
                        let var4 := addmod(var0, var3, R)
                        let var5 := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593efffe801
                        let var6 := mulmod(var4, var5, R)
                        let var7 := addmod(var2, var6, R)
                        let a_4 := calldataload(0x0864)
                        let var8 := mulmod(var1, a_4, R)
                        let var9 := 0x0
                        let var10 := mulmod(var4, var9, R)
                        let var11 := addmod(var8, var10, R)
                        input_0 := var7
                        input_0 := addmod(mulmod(input_0, theta, R), var11, R)
                        input_0 := addmod(input_0, beta, R)
                    }
                    let lhs
                    let rhs
                    rhs := table
                    {
                        let tmp := input_0
                        rhs := addmod(rhs, sub(R, mulmod(calldataload(0x0f24), tmp, R)), R)
                        lhs := mulmod(mulmod(table, tmp, R), addmod(calldataload(0x0f04), sub(R, calldataload(0x0ee4)), R), R)
                    }
                    let eval := mulmod(addmod(1, sub(R, addmod(mload(L_BLIND_MPTR), mload(L_LAST_MPTR), R)), R), addmod(lhs, sub(R, rhs), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := mulmod(l_0, calldataload(0x0f44), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_last := mload(L_LAST_MPTR)
                    let eval := mulmod(l_last, calldataload(0x0f44), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let theta := mload(THETA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let table
                    {
                        let f_5 := calldataload(0x0a44)
                        let f_6 := calldataload(0x0a64)
                        table := f_5
                        table := addmod(mulmod(table, theta, R), f_6, R)
                        table := addmod(table, beta, R)
                    }
                    let input_0
                    {
                        let f_10 := calldataload(0x0ae4)
                        let var0 := 0x1
                        let var1 := mulmod(f_10, var0, R)
                        let a_1 := calldataload(0x0804)
                        let var2 := mulmod(var1, a_1, R)
                        let var3 := sub(R, var1)
                        let var4 := addmod(var0, var3, R)
                        let var5 := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593efffe801
                        let var6 := mulmod(var4, var5, R)
                        let var7 := addmod(var2, var6, R)
                        let a_5 := calldataload(0x0884)
                        let var8 := mulmod(var1, a_5, R)
                        let var9 := 0x0
                        let var10 := mulmod(var4, var9, R)
                        let var11 := addmod(var8, var10, R)
                        input_0 := var7
                        input_0 := addmod(mulmod(input_0, theta, R), var11, R)
                        input_0 := addmod(input_0, beta, R)
                    }
                    let lhs
                    let rhs
                    rhs := table
                    {
                        let tmp := input_0
                        rhs := addmod(rhs, sub(R, mulmod(calldataload(0x0f84), tmp, R)), R)
                        lhs := mulmod(mulmod(table, tmp, R), addmod(calldataload(0x0f64), sub(R, calldataload(0x0f44)), R), R)
                    }
                    let eval := mulmod(addmod(1, sub(R, addmod(mload(L_BLIND_MPTR), mload(L_LAST_MPTR), R)), R), addmod(lhs, sub(R, rhs), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := mulmod(l_0, calldataload(0x0fa4), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_last := mload(L_LAST_MPTR)
                    let eval := mulmod(l_last, calldataload(0x0fa4), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let theta := mload(THETA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let table
                    {
                        let f_7 := calldataload(0x0a84)
                        table := f_7
                        table := addmod(table, beta, R)
                    }
                    let input_0
                    {
                        let f_11 := calldataload(0x0b04)
                        let var0 := 0x1
                        let var1 := mulmod(f_11, var0, R)
                        let a_0 := calldataload(0x07e4)
                        let var2 := mulmod(var1, a_0, R)
                        let var3 := sub(R, var1)
                        let var4 := addmod(var0, var3, R)
                        let var5 := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000
                        let var6 := mulmod(var4, var5, R)
                        let var7 := addmod(var2, var6, R)
                        input_0 := var7
                        input_0 := addmod(input_0, beta, R)
                    }
                    let lhs
                    let rhs
                    rhs := table
                    {
                        let tmp := input_0
                        rhs := addmod(rhs, sub(R, mulmod(calldataload(0x0fe4), tmp, R)), R)
                        lhs := mulmod(mulmod(table, tmp, R), addmod(calldataload(0x0fc4), sub(R, calldataload(0x0fa4)), R), R)
                    }
                    let eval := mulmod(addmod(1, sub(R, addmod(mload(L_BLIND_MPTR), mload(L_LAST_MPTR), R)), R), addmod(lhs, sub(R, rhs), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := mulmod(l_0, calldataload(0x1004), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_last := mload(L_LAST_MPTR)
                    let eval := mulmod(l_last, calldataload(0x1004), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let theta := mload(THETA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let table
                    {
                        let f_7 := calldataload(0x0a84)
                        table := f_7
                        table := addmod(table, beta, R)
                    }
                    let input_0
                    {
                        let f_12 := calldataload(0x0b24)
                        let var0 := 0x1
                        let var1 := mulmod(f_12, var0, R)
                        let a_1 := calldataload(0x0804)
                        let var2 := mulmod(var1, a_1, R)
                        let var3 := sub(R, var1)
                        let var4 := addmod(var0, var3, R)
                        let var5 := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000
                        let var6 := mulmod(var4, var5, R)
                        let var7 := addmod(var2, var6, R)
                        input_0 := var7
                        input_0 := addmod(input_0, beta, R)
                    }
                    let lhs
                    let rhs
                    rhs := table
                    {
                        let tmp := input_0
                        rhs := addmod(rhs, sub(R, mulmod(calldataload(0x1044), tmp, R)), R)
                        lhs := mulmod(mulmod(table, tmp, R), addmod(calldataload(0x1024), sub(R, calldataload(0x1004)), R), R)
                    }
                    let eval := mulmod(addmod(1, sub(R, addmod(mload(L_BLIND_MPTR), mload(L_LAST_MPTR), R)), R), addmod(lhs, sub(R, rhs), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := mulmod(l_0, calldataload(0x1064), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_last := mload(L_LAST_MPTR)
                    let eval := mulmod(l_last, calldataload(0x1064), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let theta := mload(THETA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let table
                    {
                        let f_8 := calldataload(0x0aa4)
                        table := f_8
                        table := addmod(table, beta, R)
                    }
                    let input_0
                    {
                        let f_13 := calldataload(0x0b44)
                        let var0 := 0x1
                        let var1 := mulmod(f_13, var0, R)
                        let a_0 := calldataload(0x07e4)
                        let var2 := mulmod(var1, a_0, R)
                        let var3 := sub(R, var1)
                        let var4 := addmod(var0, var3, R)
                        let var5 := 0x0
                        let var6 := mulmod(var4, var5, R)
                        let var7 := addmod(var2, var6, R)
                        input_0 := var7
                        input_0 := addmod(input_0, beta, R)
                    }
                    let lhs
                    let rhs
                    rhs := table
                    {
                        let tmp := input_0
                        rhs := addmod(rhs, sub(R, mulmod(calldataload(0x10a4), tmp, R)), R)
                        lhs := mulmod(mulmod(table, tmp, R), addmod(calldataload(0x1084), sub(R, calldataload(0x1064)), R), R)
                    }
                    let eval := mulmod(addmod(1, sub(R, addmod(mload(L_BLIND_MPTR), mload(L_LAST_MPTR), R)), R), addmod(lhs, sub(R, rhs), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_0 := mload(L_0_MPTR)
                    let eval := mulmod(l_0, calldataload(0x10c4), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let l_last := mload(L_LAST_MPTR)
                    let eval := mulmod(l_last, calldataload(0x10c4), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }
                {
                    let theta := mload(THETA_MPTR)
                    let beta := mload(BETA_MPTR)
                    let table
                    {
                        let f_8 := calldataload(0x0aa4)
                        table := f_8
                        table := addmod(table, beta, R)
                    }
                    let input_0
                    {
                        let f_14 := calldataload(0x0b64)
                        let var0 := 0x1
                        let var1 := mulmod(f_14, var0, R)
                        let a_1 := calldataload(0x0804)
                        let var2 := mulmod(var1, a_1, R)
                        let var3 := sub(R, var1)
                        let var4 := addmod(var0, var3, R)
                        let var5 := 0x0
                        let var6 := mulmod(var4, var5, R)
                        let var7 := addmod(var2, var6, R)
                        input_0 := var7
                        input_0 := addmod(input_0, beta, R)
                    }
                    let lhs
                    let rhs
                    rhs := table
                    {
                        let tmp := input_0
                        rhs := addmod(rhs, sub(R, mulmod(calldataload(0x1104), tmp, R)), R)
                        lhs := mulmod(mulmod(table, tmp, R), addmod(calldataload(0x10e4), sub(R, calldataload(0x10c4)), R), R)
                    }
                    let eval := mulmod(addmod(1, sub(R, addmod(mload(L_BLIND_MPTR), mload(L_LAST_MPTR), R)), R), addmod(lhs, sub(R, rhs), R), R)
                    quotient_eval_numer := addmod(mulmod(quotient_eval_numer, y, r), eval, r)
                }

                pop(y)

                let quotient_eval := mulmod(quotient_eval_numer, mload(X_N_MINUS_1_INV_MPTR), r)
                mstore(QUOTIENT_EVAL_MPTR, quotient_eval)
            }

            // Compute quotient commitment
            {
                mstore(0x00, calldataload(LAST_QUOTIENT_X_CPTR))
                mstore(0x20, calldataload(add(LAST_QUOTIENT_X_CPTR, 0x20)))
                let x_n := mload(X_N_MPTR)
                for
                    {
                        let cptr := sub(LAST_QUOTIENT_X_CPTR, 0x40)
                        let cptr_end := sub(FIRST_QUOTIENT_X_CPTR, 0x40)
                    }
                    lt(cptr_end, cptr)
                    {}
                {
                    success := ec_mul_acc(success, x_n)
                    success := ec_add_acc(success, calldataload(cptr), calldataload(add(cptr, 0x20)))
                    cptr := sub(cptr, 0x40)
                }
                mstore(QUOTIENT_X_MPTR, mload(0x00))
                mstore(QUOTIENT_Y_MPTR, mload(0x20))
            }

            // Compute pairing lhs and rhs
            {
                {
                    let x := mload(X_MPTR)
                    let omega := mload(OMEGA_MPTR)
                    let omega_inv := mload(OMEGA_INV_MPTR)
                    let x_pow_of_omega := mulmod(x, omega, R)
                    mstore(0x0420, x_pow_of_omega)
                    mstore(0x0400, x)
                    x_pow_of_omega := mulmod(x, omega_inv, R)
                    mstore(0x03e0, x_pow_of_omega)
                    x_pow_of_omega := mulmod(x_pow_of_omega, omega_inv, R)
                    x_pow_of_omega := mulmod(x_pow_of_omega, omega_inv, R)
                    x_pow_of_omega := mulmod(x_pow_of_omega, omega_inv, R)
                    x_pow_of_omega := mulmod(x_pow_of_omega, omega_inv, R)
                    x_pow_of_omega := mulmod(x_pow_of_omega, omega_inv, R)
                    mstore(0x03c0, x_pow_of_omega)
                }
                {
                    let mu := mload(MU_MPTR)
                    for
                        {
                            let mptr := 0x0440
                            let mptr_end := 0x04c0
                            let point_mptr := 0x03c0
                        }
                        lt(mptr, mptr_end)
                        {
                            mptr := add(mptr, 0x20)
                            point_mptr := add(point_mptr, 0x20)
                        }
                    {
                        mstore(mptr, addmod(mu, sub(R, mload(point_mptr)), R))
                    }
                    let s
                    s := mload(0x0480)
                    mstore(0x04c0, s)
                    let diff
                    diff := mload(0x0440)
                    diff := mulmod(diff, mload(0x0460), R)
                    diff := mulmod(diff, mload(0x04a0), R)
                    mstore(0x04e0, diff)
                    mstore(0x00, diff)
                    diff := mload(0x0440)
                    diff := mulmod(diff, mload(0x04a0), R)
                    mstore(0x0500, diff)
                    diff := mload(0x0440)
                    mstore(0x0520, diff)
                    diff := mload(0x0460)
                    mstore(0x0540, diff)
                    diff := mload(0x0440)
                    diff := mulmod(diff, mload(0x0460), R)
                    mstore(0x0560, diff)
                }
                {
                    let point_2 := mload(0x0400)
                    let coeff
                    coeff := 1
                    coeff := mulmod(coeff, mload(0x0480), R)
                    mstore(0x20, coeff)
                }
                {
                    let point_1 := mload(0x03e0)
                    let point_2 := mload(0x0400)
                    let coeff
                    coeff := addmod(point_1, sub(R, point_2), R)
                    coeff := mulmod(coeff, mload(0x0460), R)
                    mstore(0x40, coeff)
                    coeff := addmod(point_2, sub(R, point_1), R)
                    coeff := mulmod(coeff, mload(0x0480), R)
                    mstore(0x60, coeff)
                }
                {
                    let point_1 := mload(0x03e0)
                    let point_2 := mload(0x0400)
                    let point_3 := mload(0x0420)
                    let coeff
                    coeff := addmod(point_1, sub(R, point_2), R)
                    coeff := mulmod(coeff, addmod(point_1, sub(R, point_3), R), R)
                    coeff := mulmod(coeff, mload(0x0460), R)
                    mstore(0x80, coeff)
                    coeff := addmod(point_2, sub(R, point_1), R)
                    coeff := mulmod(coeff, addmod(point_2, sub(R, point_3), R), R)
                    coeff := mulmod(coeff, mload(0x0480), R)
                    mstore(0xa0, coeff)
                    coeff := addmod(point_3, sub(R, point_1), R)
                    coeff := mulmod(coeff, addmod(point_3, sub(R, point_2), R), R)
                    coeff := mulmod(coeff, mload(0x04a0), R)
                    mstore(0xc0, coeff)
                }
                {
                    let point_0 := mload(0x03c0)
                    let point_2 := mload(0x0400)
                    let point_3 := mload(0x0420)
                    let coeff
                    coeff := addmod(point_0, sub(R, point_2), R)
                    coeff := mulmod(coeff, addmod(point_0, sub(R, point_3), R), R)
                    coeff := mulmod(coeff, mload(0x0440), R)
                    mstore(0xe0, coeff)
                    coeff := addmod(point_2, sub(R, point_0), R)
                    coeff := mulmod(coeff, addmod(point_2, sub(R, point_3), R), R)
                    coeff := mulmod(coeff, mload(0x0480), R)
                    mstore(0x0100, coeff)
                    coeff := addmod(point_3, sub(R, point_0), R)
                    coeff := mulmod(coeff, addmod(point_3, sub(R, point_2), R), R)
                    coeff := mulmod(coeff, mload(0x04a0), R)
                    mstore(0x0120, coeff)
                }
                {
                    let point_2 := mload(0x0400)
                    let point_3 := mload(0x0420)
                    let coeff
                    coeff := addmod(point_2, sub(R, point_3), R)
                    coeff := mulmod(coeff, mload(0x0480), R)
                    mstore(0x0140, coeff)
                    coeff := addmod(point_3, sub(R, point_2), R)
                    coeff := mulmod(coeff, mload(0x04a0), R)
                    mstore(0x0160, coeff)
                }
                {
                    success := batch_invert(success, 0, 0x0180)
                    let diff_0_inv := mload(0x00)
                    mstore(0x04e0, diff_0_inv)
                    for
                        {
                            let mptr := 0x0500
                            let mptr_end := 0x0580
                        }
                        lt(mptr, mptr_end)
                        { mptr := add(mptr, 0x20) }
                    {
                        mstore(mptr, mulmod(mload(mptr), diff_0_inv, R))
                    }
                }
                {
                    let coeff := mload(0x20)
                    let zeta := mload(ZETA_MPTR)
                    let r_eval := 0
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x0c44), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, mload(QUOTIENT_EVAL_MPTR), R), R)
                    for
                        {
                            let mptr := 0x0dc4
                            let mptr_end := 0x0c44
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x20) }
                    {
                        r_eval := addmod(mulmod(r_eval, zeta, R), mulmod(coeff, calldataload(mptr), R), R)
                    }
                    for
                        {
                            let mptr := 0x0c24
                            let mptr_end := 0x0984
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x20) }
                    {
                        r_eval := addmod(mulmod(r_eval, zeta, R), mulmod(coeff, calldataload(mptr), R), R)
                    }
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x1104), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x10a4), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x1044), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x0fe4), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x0f84), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x0f24), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x0924), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(coeff, calldataload(0x0884), R), R)
                    for
                        {
                            let mptr := 0x0844
                            let mptr_end := 0x07c4
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x20) }
                    {
                        r_eval := addmod(mulmod(r_eval, zeta, R), mulmod(coeff, calldataload(mptr), R), R)
                    }
                    mstore(0x0580, r_eval)
                }
                {
                    let zeta := mload(ZETA_MPTR)
                    let r_eval := 0
                    r_eval := addmod(r_eval, mulmod(mload(0x40), calldataload(0x0984), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x60), calldataload(0x0864), R), R)
                    r_eval := mulmod(r_eval, mload(0x0500), R)
                    mstore(0x05a0, r_eval)
                }
                {
                    let zeta := mload(ZETA_MPTR)
                    let r_eval := 0
                    r_eval := addmod(r_eval, mulmod(mload(0x80), calldataload(0x0944), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0xa0), calldataload(0x08c4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0xc0), calldataload(0x0904), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x80), calldataload(0x0964), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0xa0), calldataload(0x08a4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0xc0), calldataload(0x08e4), R), R)
                    r_eval := mulmod(r_eval, mload(0x0520), R)
                    mstore(0x05c0, r_eval)
                }
                {
                    let zeta := mload(ZETA_MPTR)
                    let r_eval := 0
                    r_eval := addmod(r_eval, mulmod(mload(0xe0), calldataload(0x0e84), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0100), calldataload(0x0e44), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0120), calldataload(0x0e64), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0xe0), calldataload(0x0e24), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0100), calldataload(0x0de4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0120), calldataload(0x0e04), R), R)
                    r_eval := mulmod(r_eval, mload(0x0540), R)
                    mstore(0x05e0, r_eval)
                }
                {
                    let zeta := mload(ZETA_MPTR)
                    let r_eval := 0
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x10c4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x10e4), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x1064), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x1084), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x1004), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x1024), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x0fa4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x0fc4), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x0f44), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x0f64), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x0ee4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x0f04), R), R)
                    r_eval := mulmod(r_eval, zeta, R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0140), calldataload(0x0ea4), R), R)
                    r_eval := addmod(r_eval, mulmod(mload(0x0160), calldataload(0x0ec4), R), R)
                    r_eval := mulmod(r_eval, mload(0x0560), R)
                    mstore(0x0600, r_eval)
                }
                {
                    let sum := mload(0x20)
                    mstore(0x0620, sum)
                }
                {
                    let sum := mload(0x40)
                    sum := addmod(sum, mload(0x60), R)
                    mstore(0x0640, sum)
                }
                {
                    let sum := mload(0x80)
                    sum := addmod(sum, mload(0xa0), R)
                    sum := addmod(sum, mload(0xc0), R)
                    mstore(0x0660, sum)
                }
                {
                    let sum := mload(0xe0)
                    sum := addmod(sum, mload(0x0100), R)
                    sum := addmod(sum, mload(0x0120), R)
                    mstore(0x0680, sum)
                }
                {
                    let sum := mload(0x0140)
                    sum := addmod(sum, mload(0x0160), R)
                    mstore(0x06a0, sum)
                }
                {
                    for
                        {
                            let mptr := 0x00
                            let mptr_end := 0xa0
                            let sum_mptr := 0x0620
                        }
                        lt(mptr, mptr_end)
                        {
                            mptr := add(mptr, 0x20)
                            sum_mptr := add(sum_mptr, 0x20)
                        }
                    {
                        mstore(mptr, mload(sum_mptr))
                    }
                    success := batch_invert(success, 0, 0xa0)
                    let r_eval := mulmod(mload(0x80), mload(0x0600), R)
                    for
                        {
                            let sum_inv_mptr := 0x60
                            let sum_inv_mptr_end := 0xa0
                            let r_eval_mptr := 0x05e0
                        }
                        lt(sum_inv_mptr, sum_inv_mptr_end)
                        {
                            sum_inv_mptr := sub(sum_inv_mptr, 0x20)
                            r_eval_mptr := sub(r_eval_mptr, 0x20)
                        }
                    {
                        r_eval := mulmod(r_eval, mload(NU_MPTR), R)
                        r_eval := addmod(r_eval, mulmod(mload(sum_inv_mptr), mload(r_eval_mptr), R), R)
                    }
                    mstore(R_EVAL_MPTR, r_eval)
                }
                {
                    let nu := mload(NU_MPTR)
                    mstore(0x00, calldataload(0x0664))
                    mstore(0x20, calldataload(0x0684))
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, mload(QUOTIENT_X_MPTR), mload(QUOTIENT_Y_MPTR))
                    for
                        {
                            let mptr := 0x1400
                            let mptr_end := 0x0d00
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x40) }
                    {
                        success := ec_mul_acc(success, mload(ZETA_MPTR))
                        success := ec_add_acc(success, mload(mptr), mload(add(mptr, 0x20)))
                    }
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, mload(0x0c80), mload(0x0ca0))
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, mload(0x0c40), mload(0x0c60))
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, mload(0x0d00), mload(0x0d20))
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, mload(0x0cc0), mload(0x0ce0))
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, mload(0x0c00), mload(0x0c20))
                    for
                        {
                            let mptr := 0x03e4
                            let mptr_end := 0x0224
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x40) }
                    {
                        success := ec_mul_acc(success, mload(ZETA_MPTR))
                        success := ec_add_acc(success, calldataload(mptr), calldataload(add(mptr, 0x20)))
                    }
                    success := ec_mul_acc(success, mload(ZETA_MPTR))
                    success := ec_add_acc(success, calldataload(0x01a4), calldataload(0x01c4))
                    for
                        {
                            let mptr := 0x0124
                            let mptr_end := 0x24
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x40) }
                    {
                        success := ec_mul_acc(success, mload(ZETA_MPTR))
                        success := ec_add_acc(success, calldataload(mptr), calldataload(add(mptr, 0x20)))
                    }
                    mstore(0x80, calldataload(0x0164))
                    mstore(0xa0, calldataload(0x0184))
                    success := ec_mul_tmp(success, mulmod(nu, mload(0x0500), R))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    nu := mulmod(nu, mload(NU_MPTR), R)
                    mstore(0x80, calldataload(0x0224))
                    mstore(0xa0, calldataload(0x0244))
                    success := ec_mul_tmp(success, mload(ZETA_MPTR))
                    success := ec_add_tmp(success, calldataload(0x01e4), calldataload(0x0204))
                    success := ec_mul_tmp(success, mulmod(nu, mload(0x0520), R))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    nu := mulmod(nu, mload(NU_MPTR), R)
                    mstore(0x80, calldataload(0x0464))
                    mstore(0xa0, calldataload(0x0484))
                    success := ec_mul_tmp(success, mload(ZETA_MPTR))
                    success := ec_add_tmp(success, calldataload(0x0424), calldataload(0x0444))
                    success := ec_mul_tmp(success, mulmod(nu, mload(0x0540), R))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    nu := mulmod(nu, mload(NU_MPTR), R)
                    mstore(0x80, calldataload(0x0624))
                    mstore(0xa0, calldataload(0x0644))
                    for
                        {
                            let mptr := 0x05e4
                            let mptr_end := 0x0464
                        }
                        lt(mptr_end, mptr)
                        { mptr := sub(mptr, 0x40) }
                    {
                        success := ec_mul_tmp(success, mload(ZETA_MPTR))
                        success := ec_add_tmp(success, calldataload(mptr), calldataload(add(mptr, 0x20)))
                    }
                    success := ec_mul_tmp(success, mulmod(nu, mload(0x0560), R))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    mstore(0x80, mload(G1_X_MPTR))
                    mstore(0xa0, mload(G1_Y_MPTR))
                    success := ec_mul_tmp(success, sub(R, mload(R_EVAL_MPTR)))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    mstore(0x80, calldataload(0x1124))
                    mstore(0xa0, calldataload(0x1144))
                    success := ec_mul_tmp(success, sub(R, mload(0x04c0)))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    mstore(0x80, calldataload(0x1164))
                    mstore(0xa0, calldataload(0x1184))
                    success := ec_mul_tmp(success, mload(MU_MPTR))
                    success := ec_add_acc(success, mload(0x80), mload(0xa0))
                    mstore(PAIRING_LHS_X_MPTR, mload(0x00))
                    mstore(PAIRING_LHS_Y_MPTR, mload(0x20))
                    mstore(PAIRING_RHS_X_MPTR, calldataload(0x1164))
                    mstore(PAIRING_RHS_Y_MPTR, calldataload(0x1184))
                }
            }

            // Random linear combine with accumulator
            if mload(HAS_ACCUMULATOR_MPTR) {
                mstore(0x00, mload(ACC_LHS_X_MPTR))
                mstore(0x20, mload(ACC_LHS_Y_MPTR))
                mstore(0x40, mload(ACC_RHS_X_MPTR))
                mstore(0x60, mload(ACC_RHS_Y_MPTR))
                mstore(0x80, mload(PAIRING_LHS_X_MPTR))
                mstore(0xa0, mload(PAIRING_LHS_Y_MPTR))
                mstore(0xc0, mload(PAIRING_RHS_X_MPTR))
                mstore(0xe0, mload(PAIRING_RHS_Y_MPTR))
                let challenge := mod(keccak256(0x00, 0x100), r)

                // [pairing_lhs] += challenge * [acc_lhs]
                success := ec_mul_acc(success, challenge)
                success := ec_add_acc(success, mload(PAIRING_LHS_X_MPTR), mload(PAIRING_LHS_Y_MPTR))
                mstore(PAIRING_LHS_X_MPTR, mload(0x00))
                mstore(PAIRING_LHS_Y_MPTR, mload(0x20))

                // [pairing_rhs] += challenge * [acc_rhs]
                mstore(0x00, mload(ACC_RHS_X_MPTR))
                mstore(0x20, mload(ACC_RHS_Y_MPTR))
                success := ec_mul_acc(success, challenge)
                success := ec_add_acc(success, mload(PAIRING_RHS_X_MPTR), mload(PAIRING_RHS_Y_MPTR))
                mstore(PAIRING_RHS_X_MPTR, mload(0x00))
                mstore(PAIRING_RHS_Y_MPTR, mload(0x20))
            }

            // Perform pairing
            success := ec_pairing(
                success,
                mload(PAIRING_LHS_X_MPTR),
                mload(PAIRING_LHS_Y_MPTR),
                mload(PAIRING_RHS_X_MPTR),
                mload(PAIRING_RHS_Y_MPTR)
            )

            // Revert if anything fails
            if iszero(success) {
                revert(0x00, 0x00)
            }

            // Return 1 as result if everything succeeds
            mstore(0x00, 1)
            return(0x00, 0x20)
        }
    }
}