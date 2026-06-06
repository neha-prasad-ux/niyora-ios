import Foundation

struct KnownServer: Codable {
    let id:         String
    let name:       String
    var lastSeenAt: Date
}

struct KnownServerStore {
    private let udKey = "niyora.known_servers"

    func all() -> [KnownServer] {
        guard
            let data    = UserDefaults.standard.data(forKey: udKey),
            let servers = try? JSONDecoder().decode([KnownServer].self, from: data)
        else { return [] }
        return servers
    }

    func upsert(_ server: KnownServer) {
        var list = all().filter { $0.id != server.id }
        list.append(server)
        persist(list)
    }

    func remove(id: String) {
        persist(all().filter { $0.id != id })
    }

    func contains(id: String) -> Bool {
        all().contains(where: { $0.id == id })
    }

    private func persist(_ list: [KnownServer]) {
        guard let data = try? JSONEncoder().encode(list) else { return }
        UserDefaults.standard.set(data, forKey: udKey)
    }
}
