// Copyright 2015 by Paulo Augusto Peccin. See licence.txt distributed with this file.

// Implements the 8K-512K "3E" Tigervision (+RAM) format

function Cartridge8K_512K_3E(rom, format) {

    function init(self) {
        self.rom = rom;
        self.format = format;
        bytes = rom.content;        // uses the content of the ROM directly
        selectableSliceMaxBank = (bytes.length - BANK_SIZE) / BANK_SIZE - 1;
        fixedSliceAddressOffset = bytes.length - BANK_SIZE * 2;
    }

    this.read = function(address) {
        var maskedAddress = maskAddress(address);
        if (maskedAddress >= FIXED_SLICE_START_ADDRESS)						// ROM Fixed Slice
            return bytes[fixedSliceAddressOffset + maskedAddress];
        else
        if (extraRAMBankAddressOffset >= 0 && maskedAddress < 0x0400)		// RAM
            return extraRAM[extraRAMBankAddressOffset + maskedAddress] || 0;
        else
            return bytes[bankAddressOffset + maskedAddress];				// ROM Selectable Slice
    };

    this.write = function(address, val) {
        // Check if Extra RAM bank is selected
        if (extraRAMBankAddressOffset < 0) return;

        var maskedAddress = maskAddress(address);
        // Check for Extra RAM writes
        if (maskedAddress >= 0x0400 && maskedAddress <= 0x07ff)
            extraRAM[extraRAMBankAddressOffset + maskedAddress - 0x0400] = val;
    };

    var maskAddress = function(address) {
        return address & ADDRESS_MASK;
    };

    // Bank switching is done only on monitored writes
    this.monitorBusBeforeWrite = function(address, data) {
        // Perform ROM bank switching as needed
        if (address === 0x003f) {
            var bank = data & 0xff;		// unsigned
            if (bank <= selectableSliceMaxBank) {
                bankAddressOffset = bank * BANK_SIZE;
                extraRAMBankAddressOffset = -1;
            }
            return;
        }
        // Perform RAM bank switching as needed
        if (address === 0x003e) {
            var ramBank = data & 0xff;	// unsigned
            extraRAMBankAddressOffset = ramBank * EXTRA_RAM_BANK_SIZE;
        }
    };


    // Savestate  -------------------------------------------

    this.saveState = function() {
        return {
            f: this.format.name,
            r: this.rom.saveState(),
            b: btoa(Util.uInt8ArrayToByteString(bytes)),
            bo: bankAddressOffset,
            sm: selectableSliceMaxBank,
            fo: fixedSliceAddressOffset,
            ro: extraRAMBankAddressOffset,
            ra: btoa(Util.uInt8ArrayToByteString(extraRAM))
        };
    };

    this.loadState = function(state) {
        this.format = CartridgeFormats[state.f];
        this.rom = ROM.loadState(state.r);
        bytes = Util.byteStringToUInt8Array(atob(state.b));
        bankAddressOffset = state.bo;
        selectableSliceMaxBank = state.sm;
        fixedSliceAddressOffset = state.fo;
        extraRAMBankAddressOffset = state.ro;
        extraRAM = Util.byteStringToUInt8Array(atob(state.ra));
    };


    var bytes;

    var EXTRA_RAM_BANK_SIZE = 1024;

    var bankAddressOffset = 0;
    var selectableSliceMaxBank;
    var fixedSliceAddressOffset;		                                // This slice is fixed at the last bank
    var extraRAMBankAddressOffset = -1;		                            // No Extra RAM bank selected
    var extraRAM = Util.arrayFill(new Array(EXTRA_RAM_BANK_SIZE), 0);   // Pre allocate minimum RAM bank for performance


    var ADDRESS_MASK = 0x0fff;
    var BANK_SIZE = 2048;
    var FIXED_SLICE_START_ADDRESS = 2048;


    if (rom) init(this);

}

Cartridge8K_512K_3E.prototype = CartridgeBankedByBusMonitoring.base;

Cartridge8K_512K_3E.createFromSaveState = function(state) {
    var cart = new Cartridge8K_512K_3E();
    cart.loadState(state);
    return cart;
};