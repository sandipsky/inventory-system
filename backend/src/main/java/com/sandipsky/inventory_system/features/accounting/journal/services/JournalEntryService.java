package com.sandipsky.inventory_system.features.accounting.journal.services;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.JournalEntryDTO;
import com.sandipsky.inventory_system.features.accounting.journal.entities.JournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.MasterJournalEntryRepository;
import com.sandipsky.inventory_system.features.accounting.journal.dtos.MasterJournalEntryDTO;
import com.sandipsky.inventory_system.features.accounting.journal.entities.MasterJournalEntry;
import com.sandipsky.inventory_system.features.accounting.journal.repositories.JournalEntryRepository;
import com.sandipsky.inventory_system.features.settings.document_numbering.services.DocumentNumberingService;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.features.accounting.account.entities.AccountMaster;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;

@Service
public class JournalEntryService {
    @Autowired
    private MasterJournalEntryRepository repository;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private AccountMasterRepository accountMasterRepository;

    @Autowired
    private DocumentNumberingService documentNumberService;

    public List<MasterJournalEntryDTO> getAllJournalReport() {
        List<MasterJournalEntry> journalEntries = repository.findAll();
        List<MasterJournalEntryDTO> journalEntriesDTO = new ArrayList<>();
        for (MasterJournalEntry entry : journalEntries) {
            journalEntriesDTO.add(mapToDTO(entry));
        }
        return journalEntriesDTO;
    }

    @Transactional
    public MasterJournalEntry saveMasterJournalEntry(MasterJournalEntryDTO masterJournalEntryDTO) {
        validateBalanced(masterJournalEntryDTO.getJournalEntries());

        MasterJournalEntry masterJournalEntry = new MasterJournalEntry();
        masterJournalEntry.setDate(masterJournalEntryDTO.getDate());
        masterJournalEntry.setRemarks(masterJournalEntryDTO.getRemarks());
        masterJournalEntry.setSystemEntryNo(documentNumberService.generateJournalNumber());

        MasterJournalEntry savedEntry = repository.save(masterJournalEntry);

        if (masterJournalEntryDTO.getJournalEntries() != null) {
            for (JournalEntryDTO item : masterJournalEntryDTO.getJournalEntries()) {
                // Saving journal Entry
                JournalEntry journalEntry = new JournalEntry();
                AccountMaster accountMaster = accountMasterRepository.findById(item.getAccountMasterId())
                        .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
                journalEntry.setMasterAccount(accountMaster);
                journalEntry.setCreditAmount(item.getCreditAmount());
                journalEntry.setDebitAmount(item.getDebitAmount());
                journalEntry.setNarration(item.getNarration());
                journalEntry.setMasterJournalEntryId(savedEntry.getId());
                journalEntryRepository.save(journalEntry);
            }
        }
        return savedEntry;
    }

    @Transactional
    public MasterJournalEntry updateMasterJournalEntry(int id, MasterJournalEntryDTO masterJournalEntryDTO) {
        validateBalanced(masterJournalEntryDTO.getJournalEntries());

        MasterJournalEntry masterJournalEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Journal Entry with Given Id not found"));
        masterJournalEntry.setDate(masterJournalEntryDTO.getDate());
        masterJournalEntry.setRemarks(masterJournalEntryDTO.getRemarks());

        List<JournalEntry> existingEntries = journalEntryRepository
                .findByMasterJournalEntryId(masterJournalEntry.getId());
        for (JournalEntry existing : existingEntries) {
            journalEntryRepository.delete(existing);
        }

        if (masterJournalEntryDTO.getJournalEntries() != null) {
            for (JournalEntryDTO item : masterJournalEntryDTO.getJournalEntries()) {
                // Saving journal Entry
                JournalEntry journalEntry = new JournalEntry();
                AccountMaster accountMaster = accountMasterRepository.findById(item.getAccountMasterId())
                        .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
                journalEntry.setMasterAccount(accountMaster);
                journalEntry.setCreditAmount(item.getCreditAmount());
                journalEntry.setDebitAmount(item.getDebitAmount());
                journalEntry.setNarration(item.getNarration());
                journalEntry.setMasterJournalEntryId(masterJournalEntry.getId());
                journalEntryRepository.save(journalEntry);
            }
        }

        return masterJournalEntry;
    }

    // Double-entry rule: a journal must have lines, and its debits must equal its credits
    private void validateBalanced(List<JournalEntryDTO> items) {
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("Journal requires at least one account line");
        }
        double totalDebit = 0;
        double totalCredit = 0;
        for (JournalEntryDTO item : items) {
            double debit = item.getDebitAmount() == null ? 0 : item.getDebitAmount();
            double credit = item.getCreditAmount() == null ? 0 : item.getCreditAmount();
            if (debit < 0 || credit < 0) {
                throw new BadRequestException("Debit and credit amounts cannot be negative");
            }
            totalDebit += debit;
            totalCredit += credit;
        }
        if (totalDebit == 0) {
            throw new BadRequestException("Journal total cannot be zero");
        }
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            throw new BadRequestException("Journal debits and credits must be equal");
        }
    }

    @Transactional
    public void deleteMasterJournalEntry(int id) {
        MasterJournalEntry masterJournalEntry = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Journal Entry with Given Id not found"));
        for (JournalEntry item : masterJournalEntry.getJournalEntries()) {
            journalEntryRepository.deleteById(item.getId());
        }
        repository.deleteById(id);
    }

    private MasterJournalEntryDTO mapToDTO(MasterJournalEntry entity) {
        MasterJournalEntryDTO masterJournalEntryDTO = new MasterJournalEntryDTO();
        masterJournalEntryDTO.setId(entity.getId());
        masterJournalEntryDTO.setDate(entity.getDate());
        masterJournalEntryDTO.setSystemEntryNo(entity.getSystemEntryNo());
        masterJournalEntryDTO.setRemarks(entity.getRemarks());
        masterJournalEntryDTO.setJournalEntries(
                entity.getJournalEntries().stream()
                        .map(pe -> {
                            JournalEntryDTO jedto = new JournalEntryDTO();
                            jedto.setId(pe.getId());
                            jedto.setAccountMasterId(pe.getMasterAccount().getId());
                            jedto.setAccountMasterName(pe.getMasterAccount().getAccountName());
                            jedto.setCreditAmount(pe.getCreditAmount());
                            jedto.setDebitAmount(pe.getDebitAmount());
                            jedto.setMasterJournalEntryId(pe.getMasterJournalEntryId());
                            jedto.setNarration(pe.getNarration());
                            return jedto;
                        }).toList());
        return masterJournalEntryDTO;
    }

}
