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

;; Error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_REGISTERED u2)
(define-constant ERR_NOT_FOUND u3)

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

;; Helper to get the last history index for a property
(define-private (get-last-history-index (property-id (string-ascii 32)))
  ;; Implementation would search for the highest index
  ;; Simplified version for brevity
  (some u0)
)

;; Read-only functions
(define-read-only (get-property (property-id (string-ascii 32)))
  (map-get? properties { property-id: property-id })
)

(define-read-only (get-property-history-entry (property-id (string-ascii 32)) (index uint))
  (map-get? property-history { property-id: property-id, index: index })
)