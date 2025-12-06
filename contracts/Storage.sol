// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title Storage
 * @notice Simple storage contract for playlist data
 * @dev This contract is deployed via CREATE2 factory and used to store playlist metadata
 */
contract Storage {
    // Storage for playlist data
    mapping(string => bytes) private data;
    
    // Events
    event DataStored(string indexed key, bytes value);
    event DataDeleted(string indexed key);
    
    /**
     * @notice Store data under a key
     * @param key The key to store data under
     * @param value The data to store
     */
    function store(string calldata key, bytes calldata value) external {
        data[key] = value;
        emit DataStored(key, value);
    }
    
    /**
     * @notice Retrieve data by key
     * @param key The key to retrieve data for
     * @return The stored data
     */
    function retrieve(string calldata key) external view returns (bytes memory) {
        return data[key];
    }
    
    /**
     * @notice Delete data by key
     * @param key The key to delete
     */
    function deleteData(string calldata key) external {
        delete data[key];
        emit DataDeleted(key);
    }
    
    /**
     * @notice Check if data exists for a key
     * @param key The key to check
     * @return True if data exists, false otherwise
     */
    function exists(string calldata key) external view returns (bool) {
        return data[key].length > 0;
    }
}

