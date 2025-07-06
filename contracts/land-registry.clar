;; Land Registry Smart Contract
;; Manages land titles on the Stacks blockchain

;; Data structures
(define-map properties
  { property-id: (string-ascii 32) }
  {
    owner: principal,
    location: (string-utf8 256),
    area: uint,
    registration-date: uint,
    last-transfer-date: uint,
    status: (string-ascii 20)
  }
)

(define-map property-history
  { property-id: (string-ascii 32), index: uint }
  {
    from: principal,
    to: principal,
    timestamp: uint,
    transaction-type: (string-ascii 20)
  }
)

;; Pending multi-signature transfers
(define-map pending-transfers
  { property-id: (string-ascii 32) }
  {
    new-owner: principal,
    required-signers: (list 10 principal),
    provided-signatures: (list 10 principal),
    expiration-height: uint,
    initiated-by: principal,
    initiated-at: uint
  }
)

;; Property valuations for enhanced tracking
(define-map property-valuations
  { property-id: (string-ascii 32), valuation-date: uint }
  {
    appraised-value: uint,
    appraiser: principal,
    valuation-type: (string-ascii 20),
    currency: (string-ascii 10)
  }
)

;; Property liens/encumbrances
(define-map property-liens
  { property-id: (string-ascii 32), lien-id: (string-ascii 32) }
  {
    lien-holder: principal,
    amount: uint,
    lien-type: (string-ascii 20),
    created-at: uint,
    status: (string-ascii 20)
  }
)

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_REGISTERED u2)
(define-constant ERR_NOT_FOUND u3)
(define-constant ERR_ALREADY_SIGNED u4)
(define-constant ERR_TRANSFER_EXPIRED u5)
(define-constant ERR_INVALID_SIGNER u6)
(define-constant ERR_TRANSFER_NOT_FOUND u7)
(define-constant ERR_INSUFFICIENT_SIGNATURES u8)
(define-constant ERR_LIEN_EXISTS u9)
(define-constant ERR_LIEN_NOT_FOUND u10)

;; Registry officials - can be expanded to use a more sophisticated role system
(define-data-var registry-authority principal tx-sender)

;; Check if caller is the registry authority
(define-private (is-registry-authority)
  (is-eq tx-sender (var-get registry-authority))
)

;; Register a new property
(define-public (register-property 
    (property-id (string-ascii 32))
    (location (string-utf8 256))
    (area uint)
    (initial-owner principal)
    (status (string-ascii 20))
  )
  (begin
    ;; Only registry authority can register properties
    (asserts! (is-registry-authority) (err ERR_UNAUTHORIZED))
    
    ;; Check if property already exists
    (asserts! (is-none (map-get? properties { property-id: property-id })) 
              (err ERR_ALREADY_REGISTERED))
    
    ;; Register the property
    (map-set properties
      { property-id: property-id }
      {
        owner: initial-owner,
        location: location,
        area: area,
        registration-date: block-height,
        last-transfer-date: block-height,
        status: status
      }
    )
    
    ;; Record in history
    (map-set property-history
      { property-id: property-id, index: u0 }
      {
        from: (var-get registry-authority),
        to: initial-owner,
        timestamp: block-height,
        transaction-type: "REGISTRATION"
      }
    )
    
    (ok true)
  )
)

;; Transfer property ownership
(define-public (transfer-property
    (property-id (string-ascii 32))
    (new-owner principal)
  )
  (let (
    (property (unwrap! (map-get? properties { property-id: property-id }) (err ERR_NOT_FOUND)))
    (current-owner (get owner property))
    (history-index (+ u1 (default-to u0 (get-last-history-index property-id))))
  )
    ;; Only current owner can transfer the property
    (asserts! (is-eq tx-sender current-owner) (err ERR_UNAUTHORIZED))
    
    ;; Update property ownership
    (map-set properties
      { property-id: property-id }
      (merge property { 
        owner: new-owner,
        last-transfer-date: block-height
      })
    )
    
    ;; Record in history
    (map-set property-history
      { property-id: property-id, index: history-index }
      {
        from: current-owner,
        to: new-owner,
        timestamp: block-height,
        transaction-type: "TRANSFER"
      }
    )
    
    (ok true)
  )
)

;; Initiate multi-signature transfer
(define-public (initiate-multi-sig-transfer
    (property-id (string-ascii 32))
    (new-owner principal)
    (required-signers (list 10 principal))
    (expiration-blocks uint)
  )
  (let (
    (property (unwrap! (map-get? properties { property-id: property-id }) (err ERR_NOT_FOUND)))
    (current-owner (get owner property))
  )
    ;; Only current owner can initiate transfer
    (asserts! (is-eq tx-sender current-owner) (err ERR_UNAUTHORIZED))

    ;; Check no pending transfer exists
    (asserts! (is-none (map-get? pending-transfers { property-id: property-id }))
              (err ERR_ALREADY_REGISTERED))

    ;; Validate required signers list (must include current owner)
    (asserts! (is-some (index-of required-signers current-owner)) (err ERR_INVALID_SIGNER))
    (asserts! (> (len required-signers) u1) (err ERR_INVALID_SIGNER))

    ;; Create pending transfer with initiator's signature
    (map-set pending-transfers
      { property-id: property-id }
      {
        new-owner: new-owner,
        required-signers: required-signers,
        provided-signatures: (list current-owner),
        expiration-height: (+ block-height expiration-blocks),
        initiated-by: current-owner,
        initiated-at: block-height
      }
    )

    (ok true)
  )
)

;; Sign a pending multi-signature transfer
(define-public (sign-transfer (property-id (string-ascii 32)))
  (let (
    (pending (unwrap! (map-get? pending-transfers { property-id: property-id }) (err ERR_TRANSFER_NOT_FOUND)))
    (required-signers (get required-signers pending))
    (provided-signatures (get provided-signatures pending))
    (expiration-height (get expiration-height pending))
  )
    ;; Check transfer hasn't expired
    (asserts! (< block-height expiration-height) (err ERR_TRANSFER_EXPIRED))

    ;; Check signer is required
    (asserts! (is-some (index-of required-signers tx-sender)) (err ERR_INVALID_SIGNER))

    ;; Check signer hasn't already signed
    (asserts! (is-none (index-of provided-signatures tx-sender)) (err ERR_ALREADY_SIGNED))

    ;; Add signature
    (let (
      (updated-signatures (unwrap! (as-max-len? (append provided-signatures tx-sender) u10) (err ERR_INVALID_SIGNER)))
    )
      (map-set pending-transfers
        { property-id: property-id }
        (merge pending { provided-signatures: updated-signatures })
      )

      ;; Check if all signatures collected and auto-execute
      (if (is-eq (len updated-signatures) (len required-signers))
        (execute-transfer-internal property-id)
        (ok true)
      )
    )
  )
)

;; Execute transfer when all signatures are collected
(define-public (execute-transfer (property-id (string-ascii 32)))
  (execute-transfer-internal property-id)
)

;; Internal function to execute transfer
(define-private (execute-transfer-internal (property-id (string-ascii 32)))
  (let (
    (pending (unwrap! (map-get? pending-transfers { property-id: property-id }) (err ERR_TRANSFER_NOT_FOUND)))
    (property (unwrap! (map-get? properties { property-id: property-id }) (err ERR_NOT_FOUND)))
    (required-signers (get required-signers pending))
    (provided-signatures (get provided-signatures pending))
    (new-owner (get new-owner pending))
    (current-owner (get owner property))
    (history-index (+ u1 (default-to u0 (get-last-history-index property-id))))
  )
    ;; Check all signatures collected
    (asserts! (is-eq (len provided-signatures) (len required-signers)) (err ERR_INSUFFICIENT_SIGNATURES))

    ;; Check transfer hasn't expired
    (asserts! (< block-height (get expiration-height pending)) (err ERR_TRANSFER_EXPIRED))

    ;; Update property ownership
    (map-set properties
      { property-id: property-id }
      (merge property {
        owner: new-owner,
        last-transfer-date: block-height
      })
    )

    ;; Record in history
    (map-set property-history
      { property-id: property-id, index: history-index }
      {
        from: current-owner,
        to: new-owner,
        timestamp: block-height,
        transaction-type: "MULTI_SIG_TRANSFER"
      }
    )

    ;; Clear pending transfer
    (map-delete pending-transfers { property-id: property-id })

    (ok true)
  )
)

;; Cancel a pending multi-signature transfer
(define-public (cancel-transfer (property-id (string-ascii 32)))
  (let (
    (pending (unwrap! (map-get? pending-transfers { property-id: property-id }) (err ERR_TRANSFER_NOT_FOUND)))
    (initiated-by (get initiated-by pending))
  )
    ;; Only initiator can cancel, or anyone if expired
    (asserts! (or
      (is-eq tx-sender initiated-by)
      (> block-height (get expiration-height pending))
    ) (err ERR_UNAUTHORIZED))

    ;; Clear pending transfer
    (map-delete pending-transfers { property-id: property-id })

    (ok true)
  )
)

;; Helper to get the last history index for a property
(define-private (get-last-history-index (property-id (string-ascii 32)))
  ;; Implementation would search for the highest index
  ;; Simplified version for brevity
  (some u0)
)

;; Add property valuation
(define-public (add-property-valuation
    (property-id (string-ascii 32))
    (appraised-value uint)
    (appraiser principal)
    (valuation-type (string-ascii 20))
    (currency (string-ascii 10))
  )
  (begin
    ;; Only registry authority can add valuations
    (asserts! (is-registry-authority) (err ERR_UNAUTHORIZED))

    ;; Check property exists
    (asserts! (is-some (map-get? properties { property-id: property-id })) (err ERR_NOT_FOUND))

    ;; Add valuation
    (map-set property-valuations
      { property-id: property-id, valuation-date: block-height }
      {
        appraised-value: appraised-value,
        appraiser: appraiser,
        valuation-type: valuation-type,
        currency: currency
      }
    )

    (ok true)
  )
)

;; Add property lien
(define-public (add-property-lien
    (property-id (string-ascii 32))
    (lien-id (string-ascii 32))
    (lien-holder principal)
    (amount uint)
    (lien-type (string-ascii 20))
  )
  (begin
    ;; Only registry authority can add liens
    (asserts! (is-registry-authority) (err ERR_UNAUTHORIZED))

    ;; Check property exists
    (asserts! (is-some (map-get? properties { property-id: property-id })) (err ERR_NOT_FOUND))

    ;; Check lien doesn't already exist
    (asserts! (is-none (map-get? property-liens { property-id: property-id, lien-id: lien-id }))
              (err ERR_LIEN_EXISTS))

    ;; Add lien
    (map-set property-liens
      { property-id: property-id, lien-id: lien-id }
      {
        lien-holder: lien-holder,
        amount: amount,
        lien-type: lien-type,
        created-at: block-height,
        status: "ACTIVE"
      }
    )

    (ok true)
  )
)

;; Remove/satisfy property lien
(define-public (remove-property-lien
    (property-id (string-ascii 32))
    (lien-id (string-ascii 32))
  )
  (let (
    (lien (unwrap! (map-get? property-liens { property-id: property-id, lien-id: lien-id }) (err ERR_LIEN_NOT_FOUND)))
    (lien-holder (get lien-holder lien))
  )
    ;; Only registry authority or lien holder can remove lien
    (asserts! (or
      (is-registry-authority)
      (is-eq tx-sender lien-holder)
    ) (err ERR_UNAUTHORIZED))

    ;; Update lien status to satisfied
    (map-set property-liens
      { property-id: property-id, lien-id: lien-id }
      (merge lien { status: "SATISFIED" })
    )

    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-property (property-id (string-ascii 32)))
  (map-get? properties { property-id: property-id })
)

(define-read-only (get-property-history-entry (property-id (string-ascii 32)) (index uint))
  (map-get? property-history { property-id: property-id, index: index })
)

(define-read-only (get-pending-transfer (property-id (string-ascii 32)))
  (map-get? pending-transfers { property-id: property-id })
)

(define-read-only (get-latest-valuation (property-id (string-ascii 32)))
  ;; This is a simplified implementation - in practice, you'd want to find the most recent valuation
  (map-get? property-valuations { property-id: property-id, valuation-date: block-height })
)

(define-read-only (get-property-lien (property-id (string-ascii 32)) (lien-id (string-ascii 32)))
  (map-get? property-liens { property-id: property-id, lien-id: lien-id })
)