package com.sandipsky.inventory_system.features.accounting.opening_balance.services;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.JournalEntryDTO;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.MasterJournalEntryDTO;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.JournalEntryRepository;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.MasterJournalEntryRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;

@Service
public class OpeningBalanceService {

    // The opening balance lives in the books as one well-known journal entry
    private static final String OPENING_BALANCE_ENTRY_NO = "OPENING-BALANCE";

    @Autowired
    private MasterJournalEntryRepository masterJournalEntryRepository;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    public MasterJournalEntryDTO getOpeningBalance() {
        MasterJournalEntry entry = masterJournalEntryRepository.findBySystemEntryNo(OPENING_BALANCE_ENTRY_NO)
                .orElse(null);
        if (entry == null) {
            MasterJournalEntryDTO empty = new MasterJournalEntryDTO();
            empty.setSystemEntryNo(OPENING_BALANCE_ENTRY_NO);
            return empty;
        }
        MasterJournalEntryDTO dto = new MasterJournalEntryDTO();
        dto.setId(entry.getId());
        dto.setDate(entry.getDate());
        dto.setSystemEntryNo(entry.getSystemEntryNo());
        dto.setRemarks(entry.getRemarks());
        dto.setJournalEntries(
                entry.getJournalEntries().stream()
                        .map(item -> {
                            JournalEntryDTO itemDto = new JournalEntryDTO();
                            itemDto.setId(item.getId());
                            itemDto.setAccountMasterId(item.getMasterAccount().getId());
                            itemDto.setAccountMasterName(item.getMasterAccount().getAccountName());
                            itemDto.setDebitAmount(item.getDebitAmount());
                            itemDto.setCreditAmount(item.getCreditAmount());
                            itemDto.setNarration(item.getNarration());
                            itemDto.setMasterJournalEntryId(item.getMasterJournalEntryId());
                            return itemDto;
                        }).toList());
        return dto;
    }

    // Saving replaces the previous opening balance entirely
    @Transactional
    public MasterJournalEntry saveOpeningBalance(MasterJournalEntryDTO dto) {
        if (dto.getJournalEntries() == null || dto.getJournalEntries().isEmpty()) {
            throw new BadRequestException("Opening balance requires at least one account line");
        }

        double totalDebit = 0;
        double totalCredit = 0;
        for (JournalEntryDTO item : dto.getJournalEntries()) {
            totalDebit += item.getDebitAmount();
            totalCredit += item.getCreditAmount();
        }
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            throw new BadRequestException("Opening balance debits and credits must be equal");
        }

        MasterJournalEntry existing = masterJournalEntryRepository.findBySystemEntryNo(OPENING_BALANCE_ENTRY_NO)
                .orElse(null);
        if (existing != null) {
            for (JournalEntry existingEntry : existing.getJournalEntries()) {
                journalEntryRepository.delete(existingEntry);
            }
            masterJournalEntryRepository.delete(existing);
        }

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(dto.getDate());
        masterJournalEntry.setSystemEntryNo(OPENING_BALANCE_ENTRY_NO);
        masterJournalEntry.setRemarks(dto.getRemarks() == null || dto.getRemarks().isEmpty()
                ? "Opening Balance"
                : dto.getRemarks());

        MasterJournalEntry savedEntry = masterJournalEntryRepository.save(masterJournalEntry);

        for (JournalEntryDTO item : dto.getJournalEntries()) {
            AccountMaster accountMaster = accountMasterRepository.findById(item.getAccountMasterId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
            JournalEntry journalEntry = new JournalEntry();
            journalEntry.setMasterAccount(accountMaster);
            journalEntry.setDebitAmount(item.getDebitAmount());
            journalEntry.setCreditAmount(item.getCreditAmount());
            journalEntry.setNarration(item.getNarration() == null ? "Opening Balance" : item.getNarration());
            journalEntry.setMasterJournalEntryId(savedEntry.getId());
            journalEntryRepository.save(journalEntry);
        }

        return savedEntry;
    }
}
